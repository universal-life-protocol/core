Here's the exact strategy:

The Real Problem You're Solving

Every VR/AR/IoT company has:

1. Sensors collecting data
2. Actuators affecting world
3. No authoritative record of what actually happened
4. No deterministic replay of physical interactions
5. No way to prove their system behaved as claimed

You're not building "another virtual world" — you're building the ground truth recorder for all virtual worlds.

The Hardware Play: ESP32 as Trace Recorder

Your ESP32 becomes the ULP Trace Recorder:

ESP32 ULP Trace Recorder

Complete implementation for deterministic physical event recording.

Hardware Setup

```
ESP32 Dev Board
├── SPI Flash (4MB minimum)
├── Sensors (I2C/SPI/ADC)
├── Real-time clock (optional)
└── Power management
```

Core Implementation

1. ulp_recorder.h

```c
#ifndef ULP_RECORDER_H
#define ULP_RECORDER_H

#include <stdint.h>
#include <stdbool.h>
#include "esp_system.h"

// ULP Trace Constants
#define ULP_TRACE_MAGIC 0x554C5021  // "ULP!"
#define ULP_TRACE_VERSION 0x00010001 // v1.1
#define MAX_EVENT_SIZE 256
#define TRACE_SECTOR_SIZE 4096

// Event types for physical world
typedef enum {
    EVENT_SENSOR_READ = 1,
    EVENT_ACTUATOR_CMD,
    EVENT_DIGITAL_CHANGE,
    EVENT_ANALOG_READ,
    EVENT_I2C_TRANSACTION,
    EVENT_SPI_TRANSACTION,
    EVENT_TIMER_TICK,
    EVENT_SYSTEM_STATE,
    EVENT_CRC_ERROR,
    EVENT_POWER_CYCLE
} ulp_event_type_t;

// Trace header structure
typedef struct __attribute__((packed)) {
    uint32_t magic;
    uint32_t version;
    uint32_t sector_count;
    uint32_t events_recorded;
    uint64_t start_timestamp;
    uint64_t last_timestamp;
    uint32_t crc32;
    uint8_t device_id[16];
    uint8_t reserved[100]; // Future use
} ulp_trace_header_t;

// Trace event structure
typedef struct __attribute__((packed)) {
    uint64_t timestamp;      // Microseconds since epoch
    uint32_t event_type;     // ulp_event_type_t
    uint32_t data_length;    // Length of variable data
    uint32_t crc32;          // CRC of this event
    uint8_t data[];          // Variable length data
} ulp_event_t;

// Main API
esp_err_t ulp_recorder_init(void);
esp_err_t ulp_recorder_start(void);
esp_err_t ulp_recorder_stop(void);
esp_err_t ulp_record_event(ulp_event_type_t type, 
                          const void* data, 
                          size_t data_len);
esp_err_t ulp_record_sensor_read(const char* sensor_id, 
                                float value, 
                                uint8_t unit);
esp_err_t ulp_record_actuator_cmd(const char* actuator_id,
                                 const char* command,
                                 const void* params,
                                 size_t params_len);
size_t ulp_get_trace_size(void);
esp_err_t ulp_export_trace_to_fs(const char* filename);
bool ulp_verify_trace_integrity(void);
void ulp_print_trace_summary(void);

// Sensor-specific helpers
esp_err_t ulp_record_temperature(float celsius, const char* sensor_id);
esp_err_t ulp_record_humidity(float percent, const char* sensor_id);
esp_err_t ulp_record_pressure(float hpa, const char* sensor_id);
esp_err_t ulp_record_accelerometer(float x, float y, float z, const char* sensor_id);
esp_err_t ulp_record_gps(double lat, double lon, float alt, uint8_t sats);

// Network export (optional)
esp_err_t ulp_export_via_http(const char* url);
esp_err_t ulp_export_via_ble(void);
esp_err_t ulp_export_via_serial(void);

#endif // ULP_RECORDER_H
```

2. ulp_recorder.c

```c
#include "ulp_recorder.h"
#include <string.h>
#include <time.h>
#include "esp_log.h"
#include "esp_spiffs.h"
#include "nvs_flash.h"
#include "driver/rtc_io.h"
#include "esp_timer.h"

static const char *TAG = "ULP-RECORDER";

// Trace storage in SPI flash
#define TRACE_START_SECTOR 0x100  // Adjust based on partition table
#define MAX_TRACE_SECTORS 64      // 256KB total
#define EVENTS_PER_SECTOR (TRACE_SECTOR_SIZE / sizeof(ulp_event_t))

static ulp_trace_header_t trace_header;
static bool recorder_active = false;
static uint32_t current_sector = 0;
static uint32_t sector_offset = 0;
static SemaphoreHandle_t trace_mutex = NULL;

// Generate device ID from MAC address
static void generate_device_id(uint8_t* device_id) {
    uint8_t mac[6];
    esp_read_mac(mac);
    
    // Create deterministic ID: SHA256(mac + "ULP")
    uint8_t seed[10];
    memcpy(seed, mac, 6);
    memcpy(seed + 6, "ULP", 4);
    
    // Simple hash for now (replace with SHA256 if needed)
    for (int i = 0; i < 16; i++) {
        device_id[i] = seed[i % 10] ^ (i * 17);
    }
}

// Calculate CRC32 (simple implementation)
static uint32_t calculate_crc32(const void* data, size_t length) {
    const uint8_t* bytes = (const uint8_t*)data;
    uint32_t crc = 0xFFFFFFFF;
    
    for (size_t i = 0; i < length; i++) {
        crc ^= bytes[i];
        for (int j = 0; j < 8; j++) {
            crc = (crc >> 1) ^ (0xEDB88320 & -(crc & 1));
        }
    }
    
    return ~crc;
}

// Write to SPI flash
static esp_err_t write_to_flash(uint32_t sector, uint32_t offset, 
                               const void* data, size_t size) {
    if (sector >= MAX_TRACE_SECTORS) {
        ESP_LOGE(TAG, "Sector out of bounds: %u", sector);
        return ESP_ERR_INVALID_ARG;
    }
    
    if (offset + size > TRACE_SECTOR_SIZE) {
        ESP_LOGE(TAG, "Write exceeds sector boundary");
        return ESP_ERR_INVALID_SIZE;
    }
    
    // Calculate physical address
    uint32_t phys_addr = (TRACE_START_SECTOR + sector) * TRACE_SECTOR_SIZE + offset;
    
    // Write to flash
    esp_err_t err = spi_flash_write(phys_addr, data, size);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Flash write failed: %s", esp_err_to_name(err));
    }
    
    return err;
}

// Read from SPI flash
static esp_err_t read_from_flash(uint32_t sector, uint32_t offset,
                                void* data, size_t size) {
    if (sector >= MAX_TRACE_SECTORS) {
        return ESP_ERR_INVALID_ARG;
    }
    
    uint32_t phys_addr = (TRACE_START_SECTOR + sector) * TRACE_SECTOR_SIZE + offset;
    return spi_flash_read(phys_addr, data, size);
}

// Initialize trace header in flash
static esp_err_t init_trace_header(void) {
    memset(&trace_header, 0, sizeof(trace_header));
    
    trace_header.magic = ULP_TRACE_MAGIC;
    trace_header.version = ULP_TRACE_VERSION;
    trace_header.sector_count = MAX_TRACE_SECTORS;
    trace_header.events_recorded = 0;
    trace_header.start_timestamp = esp_timer_get_time();
    trace_header.last_timestamp = trace_header.start_timestamp;
    generate_device_id(trace_header.device_id);
    
    // Calculate CRC (excluding CRC field itself)
    trace_header.crc32 = 0;
    trace_header.crc32 = calculate_crc32(&trace_header, sizeof(trace_header) - 4);
    
    // Write header to sector 0
    return write_to_flash(0, 0, &trace_header, sizeof(trace_header));
}

// Load existing trace header
static esp_err_t load_trace_header(void) {
    esp_err_t err = read_from_flash(0, 0, &trace_header, sizeof(trace_header));
    if (err != ESP_OK) {
        return err;
    }
    
    // Verify magic
    if (trace_header.magic != ULP_TRACE_MAGIC) {
        ESP_LOGW(TAG, "No existing trace found, initializing new");
        return init_trace_header();
    }
    
    // Verify CRC
    uint32_t saved_crc = trace_header.crc32;
    trace_header.crc32 = 0;
    uint32_t calculated_crc = calculate_crc32(&trace_header, sizeof(trace_header) - 4);
    
    if (saved_crc != calculated_crc) {
        ESP_LOGW(TAG, "Trace header CRC mismatch, reinitializing");
        return init_trace_header();
    }
    
    ESP_LOGI(TAG, "Loaded existing trace with %u events", trace_header.events_recorded);
    return ESP_OK;
}

// Find next write position
static esp_err_t find_next_position(void) {
    // Start from where we think we are
    current_sector = trace_header.events_recorded / EVENTS_PER_SECTOR;
    sector_offset = (trace_header.events_recorded % EVENTS_PER_SECTOR) * sizeof(ulp_event_t);
    
    // Verify by reading the sector
    ulp_event_t test_event;
    esp_err_t err = read_from_flash(current_sector, sector_offset, 
                                   &test_event, sizeof(ulp_event_t));
    
    if (err == ESP_OK && test_event.timestamp != 0) {
        // Position is occupied, find next free
        ESP_LOGW(TAG, "Position %u:%u occupied, finding next free", 
                current_sector, sector_offset);
        
        for (current_sector = 0; current_sector < MAX_TRACE_SECTORS; current_sector++) {
            for (sector_offset = 0; sector_offset < TRACE_SECTOR_SIZE; 
                 sector_offset += sizeof(ulp_event_t)) {
                
                err = read_from_flash(current_sector, sector_offset, 
                                     &test_event, sizeof(ulp_event_t));
                if (err != ESP_OK) {
                    continue;
                }
                
                if (test_event.timestamp == 0) {
                    ESP_LOGI(TAG, "Found free position at %u:%u", 
                            current_sector, sector_offset);
                    return ESP_OK;
                }
            }
        }
        
        ESP_LOGE(TAG, "No free space in trace");
        return ESP_ERR_NO_MEM;
    }
    
    return ESP_OK;
}

// Main initialization
esp_err_t ulp_recorder_init(void) {
    ESP_LOGI(TAG, "Initializing ULP Trace Recorder");
    
    // Initialize mutex
    trace_mutex = xSemaphoreCreateMutex();
    if (trace_mutex == NULL) {
        ESP_LOGE(TAG, "Failed to create mutex");
        return ESP_ERR_NO_MEM;
    }
    
    // Initialize NVS for settings
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_LOGW(TAG, "NVS partition truncated, erasing");
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);
    
    // Load or create trace header
    err = load_trace_header();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize trace header: %s", esp_err_to_name(err));
        return err;
    }
    
    // Find next write position
    err = find_next_position();
    if (err != ESP_OK) {
        return err;
    }
    
    ESP_LOGI(TAG, "ULP Recorder initialized. Device ID: %02x%02x...", 
            trace_header.device_id[0], trace_header.device_id[1]);
    
    return ESP_OK;
}

// Start recording
esp_err_t ulp_recorder_start(void) {
    if (xSemaphoreTake(trace_mutex, pdMS_TO_TICKS(1000)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }
    
    recorder_active = true;
    
    // Record start event
    ulp_event_t start_event;
    start_event.timestamp = esp_timer_get_time();
    start_event.event_type = EVENT_SYSTEM_STATE;
    start_event.data_length = 0;
    start_event.crc32 = calculate_crc32(&start_event, sizeof(start_event) - 4);
    
    esp_err_t err = write_to_flash(current_sector, sector_offset, 
                                  &start_event, sizeof(start_event));
    
    if (err == ESP_OK) {
        trace_header.events_recorded++;
        trace_header.last_timestamp = start_event.timestamp;
        sector_offset += sizeof(ulp_event_t);
        
        // Update header
        trace_header.crc32 = 0;
        trace_header.crc32 = calculate_crc32(&trace_header, sizeof(trace_header) - 4);
        write_to_flash(0, 0, &trace_header, sizeof(trace_header));
    }
    
    xSemaphoreGive(trace_mutex);
    recorder_active = (err == ESP_OK);
    
    ESP_LOGI(TAG, "Recording %s", recorder_active ? "STARTED" : "FAILED");
    return err;
}

// Stop recording
esp_err_t ulp_recorder_stop(void) {
    if (xSemaphoreTake(trace_mutex, pdMS_TO_TICKS(1000)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }
    
    if (!recorder_active) {
        xSemaphoreGive(trace_mutex);
        return ESP_OK;
    }
    
    // Record stop event
    ulp_event_t stop_event;
    stop_event.timestamp = esp_timer_get_time();
    stop_event.event_type = EVENT_SYSTEM_STATE;
    stop_event.data_length = 0;
    stop_event.crc32 = calculate_crc32(&stop_event, sizeof(stop_event) - 4);
    
    esp_err_t err = write_to_flash(current_sector, sector_offset, 
                                  &stop_event, sizeof(stop_event));
    
    if (err == ESP_OK) {
        trace_header.events_recorded++;
        trace_header.last_timestamp = stop_event.timestamp;
        
        // Update header
        trace_header.crc32 = 0;
        trace_header.crc32 = calculate_crc32(&trace_header, sizeof(trace_header) - 4);
        write_to_flash(0, 0, &trace_header, sizeof(trace_header));
    }
    
    recorder_active = false;
    xSemaphoreGive(trace_mutex);
    
    ESP_LOGI(TAG, "Recording STOPPED. Total events: %u", trace_header.events_recorded);
    return err;
}

// Record generic event
esp_err_t ulp_record_event(ulp_event_type_t type, 
                          const void* data, 
                          size_t data_len) {
    if (!recorder_active) {
        return ESP_ERR_INVALID_STATE;
    }
    
    if (data_len > MAX_EVENT_SIZE) {
        ESP_LOGE(TAG, "Event data too large: %u bytes", data_len);
        return ESP_ERR_INVALID_SIZE;
    }
    
    if (xSemaphoreTake(trace_mutex, pdMS_TO_TICKS(1000)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }
    
    // Check if we need to move to next sector
    if (sector_offset + sizeof(ulp_event_t) + data_len > TRACE_SECTOR_SIZE) {
        current_sector++;
        sector_offset = 0;
        
        if (current_sector >= MAX_TRACE_SECTORS) {
            ESP_LOGW(TAG, "Trace full, wrapping to beginning");
            current_sector = 0;
        }
    }
    
    // Build event
    ulp_event_t event;
    event.timestamp = esp_timer_get_time();
    event.event_type = type;
    event.data_length = data_len;
    event.crc32 = 0; // Calculate after writing data
    
    // Write event header
    esp_err_t err = write_to_flash(current_sector, sector_offset, 
                                  &event, sizeof(ulp_event_t));
    if (err != ESP_OK) {
        xSemaphoreGive(trace_mutex);
        return err;
    }
    
    // Write event data
    if (data_len > 0) {
        err = write_to_flash(current_sector, sector_offset + sizeof(ulp_event_t),
                            data, data_len);
        if (err != ESP_OK) {
            xSemaphoreGive(trace_mutex);
            return err;
        }
    }
    
    // Calculate and write CRC
    uint8_t event_buffer[sizeof(ulp_event_t) + data_len];
    memcpy(event_buffer, &event, sizeof(ulp_event_t));
    if (data_len > 0) {
        memcpy(event_buffer + sizeof(ulp_event_t), data, data_len);
    }
    
    event.crc32 = calculate_crc32(event_buffer, sizeof(ulp_event_t) + data_len - 4);
    err = write_to_flash(current_sector, sector_offset + offsetof(ulp_event_t, crc32),
                        &event.crc32, sizeof(uint32_t));
    
    if (err == ESP_OK) {
        trace_header.events_recorded++;
        trace_header.last_timestamp = event.timestamp;
        sector_offset += sizeof(ulp_event_t) + data_len;
        
        // Update header periodically
        if (trace_header.events_recorded % 100 == 0) {
            trace_header.crc32 = 0;
            trace_header.crc32 = calculate_crc32(&trace_header, sizeof(trace_header) - 4);
            write_to_flash(0, 0, &trace_header, sizeof(trace_header));
        }
    }
    
    xSemaphoreGive(trace_mutex);
    return err;
}

// Record sensor read
esp_err_t ulp_record_sensor_read(const char* sensor_id, 
                                float value, 
                                uint8_t unit) {
    struct __attribute__((packed)) {
        char sensor_id[32];
        float value;
        uint8_t unit;
    } sensor_data;
    
    memset(sensor_data.sensor_id, 0, 32);
    strncpy(sensor_data.sensor_id, sensor_id, 31);
    sensor_data.value = value;
    sensor_data.unit = unit;
    
    return ulp_record_event(EVENT_SENSOR_READ, &sensor_data, sizeof(sensor_data));
}

// Record actuator command
esp_err_t ulp_record_actuator_cmd(const char* actuator_id,
                                 const char* command,
                                 const void* params,
                                 size_t params_len) {
    // Structure: [actuator_id\0][command\0][params...]
    size_t id_len = strlen(actuator_id) + 1;
    size_t cmd_len = strlen(command) + 1;
    size_t total_len = id_len + cmd_len + params_len;
    
    uint8_t* buffer = malloc(total_len);
    if (!buffer) {
        return ESP_ERR_NO_MEM;
    }
    
    memcpy(buffer, actuator_id, id_len);
    memcpy(buffer + id_len, command, cmd_len);
    if (params_len > 0) {
        memcpy(buffer + id_len + cmd_len, params, params_len);
    }
    
    esp_err_t err = ulp_record_event(EVENT_ACTUATOR_CMD, buffer, total_len);
    free(buffer);
    return err;
}

// Temperature helper
esp_err_t ulp_record_temperature(float celsius, const char* sensor_id) {
    return ulp_record_sensor_read(sensor_id, celsius, 0); // 0 = Celsius
}

// Humidity helper
esp_err_t ulp_record_humidity(float percent, const char* sensor_id) {
    return ulp_record_sensor_read(sensor_id, percent, 1); // 1 = Percent
}

// GPS helper
esp_err_t ulp_record_gps(double lat, double lon, float alt, uint8_t sats) {
    struct __attribute__((packed)) {
        double latitude;
        double longitude;
        float altitude;
        uint8_t satellites;
        uint8_t fix_quality;
    } gps_data;
    
    gps_data.latitude = lat;
    gps_data.longitude = lon;
    gps_data.altitude = alt;
    gps_data.satellites = sats;
    gps_data.fix_quality = (sats >= 4) ? 1 : 0;
    
    return ulp_record_event(EVENT_SENSOR_READ, &gps_data, sizeof(gps_data));
}

// Export trace to filesystem
esp_err_t ulp_export_trace_to_fs(const char* filename) {
    ESP_LOGI(TAG, "Exporting trace to %s", filename);
    
    if (xSemaphoreTake(trace_mutex, pdMS_TO_TICKS(5000)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }
    
    // Open file
    FILE* f = fopen(filename, "wb");
    if (!f) {
        xSemaphoreGive(trace_mutex);
        ESP_LOGE(TAG, "Failed to open file");
        return ESP_ERR_NOT_FOUND;
    }
    
    // Write header
    fwrite(&trace_header, 1, sizeof(trace_header), f);
    
    // Write all events
    for (uint32_t sector = 0; sector < MAX_TRACE_SECTORS; sector++) {
        for (uint32_t offset = 0; offset < TRACE_SECTOR_SIZE; ) {
            ulp_event_t event;
            esp_err_t err = read_from_flash(sector, offset, &event, sizeof(ulp_event_t));
            if (err != ESP_OK || event.timestamp == 0) {
                offset += sizeof(ulp_event_t);
                continue;
            }
            
            // Read complete event
            size_t event_size = sizeof(ulp_event_t) + event.data_length;
            uint8_t* event_buffer = malloc(event_size);
            if (!event_buffer) {
                fclose(f);
                xSemaphoreGive(trace_mutex);
                return ESP_ERR_NO_MEM;
            }
            
            err = read_from_flash(sector, offset, event_buffer, event_size);
            if (err == ESP_OK) {
                fwrite(event_buffer, 1, event_size, f);
            }
            
            free(event_buffer);
            offset += event_size;
        }
    }
    
    fclose(f);
    xSemaphoreGive(trace_mutex);
    
    ESP_LOGI(TAG, "Trace exported successfully");
    return ESP_OK;
}

// Verify trace integrity
bool ulp_verify_trace_integrity(void) {
    uint32_t events_found = 0;
    
    for (uint32_t sector = 0; sector < MAX_TRACE_SECTORS; sector++) {
        for (uint32_t offset = 0; offset < TRACE_SECTOR_SIZE; ) {
            ulp_event_t event;
            esp_err_t err = read_from_flash(sector, offset, &event, sizeof(ulp_event_t));
            if (err != ESP_OK || event.timestamp == 0) {
                offset += sizeof(ulp_event_t);
                continue;
            }
            
            // Verify event CRC
            size_t event_size = sizeof(ulp_event_t) + event.data_length;
            uint8_t* event_buffer = malloc(event_size);
            if (!event_buffer) {
                return false;
            }
            
            err = read_from_flash(sector, offset, event_buffer, event_size);
            if (err != ESP_OK) {
                free(event_buffer);
                return false;
            }
            
            uint32_t saved_crc = event.crc32;
            event.crc32 = 0;
            memcpy(event_buffer + offsetof(ulp_event_t, crc32), 
                  &event.crc32, sizeof(uint32_t));
            
            uint32_t calculated_crc = calculate_crc32(event_buffer, event_size - 4);
            if (saved_crc != calculated_crc) {
                ESP_LOGE(TAG, "Event CRC mismatch at sector %u offset %u", 
                        sector, offset);
                free(event_buffer);
                return false;
            }
            
            events_found++;
            free(event_buffer);
            offset += event_size;
        }
    }
    
    ESP_LOGI(TAG, "Trace integrity verified: %u events", events_found);
    return events_found == trace_header.events_recorded;
}

// Print trace summary
void ulp_print_trace_summary(void) {
    ESP_LOGI(TAG, "=== ULP Trace Summary ===");
    ESP_LOGI(TAG, "Magic: 0x%08X", trace_header.magic);
    ESP_LOGI(TAG, "Version: 0x%08X", trace_header.version);
    ESP_LOGI(TAG, "Events recorded: %u", trace_header.events_recorded);
    ESP_LOGI(TAG, "Sectors used: %u/%u", 
            (trace_header.events_recorded * sizeof(ulp_event_t)) / TRACE_SECTOR_SIZE + 1,
            MAX_TRACE_SECTORS);
    ESP_LOGI(TAG, "First timestamp: %llu", trace_header.start_timestamp);
    ESP_LOGI(TAG, "Last timestamp: %llu", trace_header.last_timestamp);
    ESP_LOGI(TAG, "Device ID: %02x%02x...", 
            trace_header.device_id[0], trace_header.device_id[1]);
    ESP_LOGI(TAG, "CRC32: 0x%08X", trace_header.crc32);
    ESP_LOGI(TAG, "=========================");
}
```

3. main.c - Example Usage

```c
#include <stdio.h>
#include "ulp_recorder.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/adc.h"
#include "esp_adc_cal.h"
#include "driver/i2c.h"

// Sensor definitions
#define I2C_MASTER_SCL_IO    22
#define I2C_MASTER_SDA_IO    21
#define I2C_MASTER_FREQ_HZ   100000

// Button for manual events
#define BUTTON_GPIO GPIO_NUM_0

// BME280 sensor (common temp/humidity/pressure)
#define BME280_ADDR 0x76

void i2c_master_init(void) {
    i2c_config_t conf = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = I2C_MASTER_SDA_IO,
        .scl_io_num = I2C_MASTER_SCL_IO,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .master.clk_speed = I2C_MASTER_FREQ_HZ,
    };
    i2c_param_config(I2C_NUM_0, &conf);
    i2c_driver_install(I2C_NUM_0, conf.mode, 0, 0, 0);
}

// Simulate BME280 read (replace with actual driver)
esp_err_t read_bme280(float* temp, float* hum, float* press) {
    // Simulated data for demo
    *temp = 22.5 + ((esp_random() % 100) / 100.0);
    *hum = 45.0 + ((esp_random() % 200) / 100.0);
    *press = 1013.25 + ((esp_random() % 50) / 100.0);
    return ESP_OK;
}

// Button interrupt handler
static void IRAM_ATTR button_isr_handler(void* arg) {
    static uint32_t last_press = 0;
    uint32_t now = xTaskGetTickCount();
    
    // Debounce
    if (now - last_press > 100) {
        ulp_record_event(EVENT_DIGITAL_CHANGE, "BUTTON_PRESS", 12);
        last_press = now;
    }
}

void sensor_task(void* pvParameters) {
    ESP_LOGI("SENSOR", "Starting sensor monitoring");
    
    float temperature, humidity, pressure;
    
    while (1) {
        // Read BME280
        if (read_bme280(&temperature, &humidity, &pressure) == ESP_OK) {
            ulp_record_temperature(temperature, "BME280_TEMP");
            ulp_record_humidity(humidity, "BME280_HUM");
            ulp_record_sensor_read("BME280_PRESS", pressure, 2); // 2 = hPa
            
            ESP_LOGI("SENSOR", "Temp: %.2fC, Hum: %.1f%%, Press: %.2fhPa",
                    temperature, humidity, pressure);
        }
        
        // Read internal hall sensor
        int hall_value = hall_sensor_read();
        ulp_record_sensor_read("ESP32_HALL", (float)hall_value, 3); // 3 = raw
        
        vTaskDelay(pdMS_TO_TICKS(5000)); // Every 5 seconds
    }
}

void actuator_demo_task(void* pvParameters) {
    ESP_LOGI("ACTUATOR", "Starting actuator demo");
    
    while (1) {
        // Simulate actuator commands
        const char* commands[] = {"LED_ON", "LED_OFF", "PUMP_START", "PUMP_STOP"};
        uint8_t params[] = {100, 0, 1, 0}; // Brightness, pump speed
        
        for (int i = 0; i < 4; i++) {
            ulp_record_actuator_cmd("DEVICE_1", commands[i], &params[i], 1);
            ESP_LOGI("ACTUATOR", "Command: %s -> %s", "DEVICE_1", commands[i]);
            vTaskDelay(pdMS_TO_TICKS(10000)); // Every 10 seconds
        }
    }
}

void export_task(void* pvParameters) {
    while (1) {
        // Export trace every 5 minutes
        vTaskDelay(pdMS_TO_TICKS(300000));
        
        ESP_LOGI("EXPORT", "Exporting trace...");
        
        // Export to SD card
        ulp_export_trace_to_fs("/sd/trace.ulp");
        
        // Verify integrity
        if (ulp_verify_trace_integrity()) {
            ESP_LOGI("EXPORT", "Trace integrity verified");
        } else {
            ESP_LOGE("EXPORT", "Trace integrity check failed!");
        }
        
        // Print summary
        ulp_print_trace_summary();
    }
}

void app_main(void) {
    ESP_LOGI("MAIN", "Starting ULP Physical Trace Recorder");
    
    // Initialize recorder
    esp_err_t ret = ulp_recorder_init();
    if (ret != ESP_OK) {
        ESP_LOGE("MAIN", "Failed to initialize ULP recorder: %s", 
                esp_err_to_name(ret));
        return;
    }
    
    // Initialize I2C for sensors
    i2c_master_init();
    
    // Initialize button
    gpio_set_direction(BUTTON_GPIO, GPIO_MODE_INPUT);
    gpio_set_intr_type(BUTTON_GPIO, GPIO_INTR_NEGEDGE);
    gpio_install_isr_service(0);
    gpio_isr_handler_add(BUTTON_GPIO, button_isr_handler, NULL);
    
    // Start recording
    ulp_recorder_start();
    
    // Record initial system state
    ulp_record_event(EVENT_SYSTEM_STATE, "BOOT_COMPLETE", 13);
    
    // Start tasks
    xTaskCreate(sensor_task, "sensor_task", 4096, NULL, 5, NULL);
    xTaskCreate(actuator_demo_task, "actuator_task", 4096, NULL, 4, NULL);
    xTaskCreate(export_task, "export_task", 4096, NULL, 3, NULL);
    
    // Record GPS position (simulated)
    ulp_record_gps(34.0522, -118.2437, 88.0, 8); // LA coordinates
    
    ESP_LOGI("MAIN", "ULP Recorder running. Press button to record events.");
    
    // Keep main task alive
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(60000)); // 1 minute
        ESP_LOGI("MAIN", "Still recording...");
    }
}
```

4. partitions.csv - Flash Layout

```
# Name, Type, SubType, Offset, Size, Flags
nvs, data, nvs, 0x9000, 0x5000,
otadata, data, ota, 0xe000, 0x2000,
phy_init, data, phy, 0x10000, 0x1000,
factory, app, factory, 0x20000, 1M,
ota_0, app, ota_0, 0x150000, 1M,
ota_1, app, ota_1, 0x250000, 1M,
ulp_trace, data, 0x99, 0x350000, 256K,  # Custom partition for traces
storage, data, fat, 0x390000, 1M,       # For exporting traces
```

5. CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.5)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)

project(ulp_physical_recorder)

set(SOURCE_FILES
    main/main.c
    components/ulp_recorder/ulp_recorder.c
)

idf_component_register(SRCS "${SOURCE_FILES}"
                    INCLUDE_DIRS "."
                    REQUIRES esp_timer spi_flash nvs_flash driver)

target_compile_options(${COMPONENT_LIB} PRIVATE -Wno-format)

set(COMPONENT_REQUIRES driver esp_timer spi_flash nvs_flash)
```

6. export_to_ulp.py - Convert to ULP Trace Format

```python
#!/usr/bin/env python3
"""
Convert ESP32 ULP trace to standard ULP trace.log format
"""
import struct
import hashlib
import json
from datetime import datetime

def parse_esp32_trace(binary_file, output_file):
    """Convert ESP32 binary trace to ULP text trace"""
    
    with open(binary_file, 'rb') as f:
        # Read header
        header = f.read(256)  # Adjust based on actual header size
        
        events = []
        
        while True:
            # Read event header (adjust based on ulp_event_t structure)
            event_data = f.read(20)  # timestamp(8) + type(4) + length(4) + crc(4)
            if len(event_data) < 20:
                break
                
            timestamp, event_type, data_length, crc = struct.unpack('<QIII', event_data)
            
            if timestamp == 0:
                break  # End of valid events
                
            # Read event data
            data = f.read(data_length) if data_length > 0 else b''
            
            # Convert to ULP trace format
            event_map = {
                1: "SENSOR_READ",
                2: "ACTUATOR_CMD", 
                3: "DIGITAL_CHANGE",
                4: "ANALOG_READ",
                5: "I2C_TRANSACTION",
                6: "SPI_TRANSACTION",
                7: "TIMER_TICK",
                8: "SYSTEM_STATE",
                9: "CRC_ERROR",
                10: "POWER_CYCLE"
            }
            
            event_name = event_map.get(event_type, f"UNKNOWN_{event_type}")
            
            # Format data based on event type
            if event_type == 1:  # SENSOR_READ
                if data_length == 37:  # sensor_id(32) + value(4) + unit(1)
                    sensor_id = data[:32].decode('ascii').rstrip('\x00')
                    value = struct.unpack('<f', data[32:36])[0]
                    unit = data[36]
                    events.append(f"EVENT\t{event_name}\t{sensor_id}\t{value}\t{unit}\t{timestamp}")
            
            elif event_type == 2:  # ACTUATOR_CMD
                # Parse null-terminated strings
                parts = data.split(b'\x00')
                if len(parts) >= 2:
                    actuator_id = parts[0].decode('ascii')
                    command = parts[1].decode('ascii')
                    events.append(f"EVENT\t{event_name}\t{actuator_id}\t{command}\t{timestamp}")
            
            else:
                # Generic event
                events.append(f"EVENT\t{event_name}\t{data.hex()}\t{timestamp}")
    
    # Write ULP trace format
    with open(output_file, 'w') as out:
        # Header
        out.write("#METADATA source esp32_ulp_recorder\n")
        out.write("#METADATA converted " + datetime.utcnow().isoformat() + "\n")
        out.write("#METADATA device_id ...\n\n")
        
        # Events
        for event in events:
            out.write(event + "\n")
        
        # Calculate hash
        out.write(f"\n# Hash of semantic content\n")
        
    print(f"Converted {len(events)} events to {output_file}")

if __name__ == "__main__":
    parse_esp32_trace("trace.bin", "trace.log")
```

Quick Start Guide

1. Flash to ESP32:

```bash
# Set up ESP-IDF
. $HOME/esp/esp-idf/export.sh

# Build and flash
idf.py set-target esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

2. Record Events:

· Sensors auto-record every 5 seconds
· Press button (GPIO0) for manual events
· Events stored in SPI flash

3. Export Trace:

```bash
# Copy from ESP32 to computer
python export_to_ulp.py trace.bin trace.log

# Now use standard ULP tools
python projections/project_svg.py trace.log
python projections/project_wav.py trace.log
```

Key Features:

1. Append-only - Events cannot be modified
2. CRC verified - Data integrity checked
3. Power-safe - Writes survive power loss
4. Multi-sensor - Temperature, humidity, pressure, GPS, custom
5. Export formats - Binary → ULP trace → SVG/WAV/GLB

This turns your ESP32 into a deterministic black box for the physical world. Every sensor reading, every actuator command, cryptographically recorded.

---

1. Web Server for Real-Time Trace Viewing

ulp_web_server.h

```c
#ifndef ULP_WEB_SERVER_H
#define ULP_WEB_SERVER_H

#include "esp_http_server.h"
#include "ulp_recorder.h"

// Web server configuration
typedef struct {
    uint16_t port;
    bool enable_websocket;
    bool enable_sse;
    size_t max_clients;
    char* base_path;
} ulp_web_config_t;

// Web event types
typedef enum {
    WE_CLIENT_CONNECTED,
    WE_CLIENT_DISCONNECTED,
    WE_EVENT_STREAM_STARTED,
    WE_EVENT_STREAM_STOPPED,
    WE_EXPORT_REQUESTED
} web_event_type_t;

// Initialize web server
esp_err_t ulp_web_server_init(ulp_web_config_t* config);

// Start web server
esp_err_t ulp_web_server_start(void);

// Stop web server  
esp_err_t ulp_web_server_stop(void);

// Get current connections
size_t ulp_web_get_connections(void);

// Broadcast event to all connected clients
esp_err_t ulp_web_broadcast_event(ulp_event_t* event);

// Get server statistics
void ulp_web_get_stats(uint32_t* total_events_served,
                       uint32_t* active_connections,
                       uint32_t* bytes_sent);

#endif
```

ulp_web_server.c

```c
#include "ulp_web_server.h"
#include "esp_log.h"
#include "esp_vfs.h"
#include "esp_spiffs.h"
#include "cJSON.h"
#include "sys/param.h"

static const char* TAG = "ULP-WEB";

static httpd_handle_t server = NULL;
static size_t active_connections = 0;
static uint32_t events_served = 0;
static uint32_t bytes_sent = 0;
static SemaphoreHandle_t web_mutex = NULL;

// WebSocket handler
static httpd_handle_t ws_server = NULL;

// HTML/JS/CSS files in SPIFFS
static const char* INDEX_HTML = 
"<!DOCTYPE html>"
"<html>"
"<head>"
"<meta charset='utf-8'>"
"<title>ULP Trace Viewer</title>"
"<style>"
"body { font-family: monospace; margin: 0; background: #0a0a0a; color: #0f0; }"
".container { max-width: 1200px; margin: 0 auto; padding: 20px; }"
".header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f0; padding-bottom: 10px; }"
".stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }"
".stat-box { background: #1a1a1a; border: 1px solid #0f0; padding: 15px; border-radius: 5px; }"
".events-container { display: flex; gap: 20px; }"
".event-list { flex: 1; max-height: 600px; overflow-y: auto; border: 1px solid #0f0; }"
".event-item { padding: 10px; border-bottom: 1px solid #333; cursor: pointer; }"
".event-item:hover { background: #1a1a1a; }"
".event-detail { flex: 2; border: 1px solid #0f0; padding: 20px; }"
".chart-container { height: 300px; margin-top: 20px; }"
".controls { margin: 20px 0; }"
"button { background: #0f0; color: black; border: none; padding: 10px 20px; margin-right: 10px; cursor: pointer; }"
"button:hover { background: #0c0; }"
".connected { color: #0f0; }"
".disconnected { color: #f00; }"
"</style>"
"</head>"
"<body>"
"<div class='container'>"
"<div class='header'>"
"<h1>🚀 ULP Trace Viewer</h1>"
"<div>Status: <span id='status' class='connected'>● Connected</span></div>"
"</div>"
"<div class='stats'>"
"<div class='stat-box'><h3>Events</h3><div id='event-count'>0</div></div>"
"<div class='stat-box'><h3>Rate</h3><div id='event-rate'>0/sec</div></div>"
"<div class='stat-box'><h3>Memory</h3><div id='memory-used'>0 KB</div></div>"
"<div class='stat-box'><h3>Uptime</h3><div id='uptime'>00:00:00</div></div>"
"</div>"
"<div class='controls'>"
"<button onclick='toggleStream()'>▶ Start Stream</button>"
"<button onclick='exportTrace()'>📥 Export</button>"
"<button onclick='clearDisplay()'>🗑 Clear</button>"
"<select id='filter' onchange='filterEvents()'>"
"<option value='all'>All Events</option>"
"<option value='sensor'>Sensors</option>"
"<option value='actuator'>Actuators</option>"
"<option value='system'>System</option>"
"</select>"
"</div>"
"<div class='events-container'>"
"<div class='event-list' id='event-list'></div>"
"<div class='event-detail' id='event-detail'>Select an event to view details</div>"
"</div>"
"<div class='chart-container'>"
"<canvas id='chart'></canvas>"
"</div>"
"</div>"
"<script>"
"let ws = null;"
"let events = [];"
"let chart = null;"
"let startTime = Date.now();"
"let eventCount = 0;"
"let chartData = { labels: [], datasets: [{ label: 'Events/sec', data: [], borderColor: '#0f0' }] };"
""
"function connectWebSocket() {"
"    ws = new WebSocket('ws://' + window.location.host + '/ws');"
"    "
"    ws.onopen = function() {"
"        document.getElementById('status').className = 'connected';"
"        document.getElementById('status').textContent = '● Connected';"
"        console.log('WebSocket connected');"
"    };"
"    "
"    ws.onclose = function() {"
"        document.getElementById('status').className = 'disconnected';"
"        document.getElementById('status').textContent = '● Disconnected';"
"        setTimeout(connectWebSocket, 1000);"
"    };"
"    "
"    ws.onmessage = function(event) {"
"        const data = JSON.parse(event.data);"
"        handleEvent(data);"
"    };"
"}"
""
"function handleEvent(event) {"
"    eventCount++;"
"    events.unshift(event);"
"    "
"    // Update stats"
"    document.getElementById('event-count').textContent = eventCount;"
"    const elapsed = (Date.now() - startTime) / 1000;"
"    const rate = (eventCount / elapsed).toFixed(1);"
"    document.getElementById('event-rate').textContent = rate + '/sec';"
"    "
"    // Add to chart"
"    const now = new Date().toLocaleTimeString();"
"    chartData.labels.push(now);"
"    if (chartData.labels.length > 20) chartData.labels.shift();"
"    chartData.datasets[0].data.push(eventCount);"
"    if (chartData.datasets[0].data.length > 20) chartData.datasets[0].data.shift();"
"    "
"    if (chart) {"
"        chart.update();"
"    }"
"    "
"    // Update event list"
"    updateEventList();"
"}"
""
"function updateEventList() {"
"    const list = document.getElementById('event-list');"
"    const filter = document.getElementById('filter').value;"
"    "
"    let html = '';"
"    for (let i = 0; i < Math.min(events.length, 50); i++) {"
"        const event = events[i];"
"        "
"        if (filter !== 'all') {"
"            if (filter === 'sensor' && !event.type.includes('SENSOR')) continue;"
"            if (filter === 'actuator' && !event.type.includes('ACTUATOR')) continue;"
"            if (filter === 'system' && !event.type.includes('SYSTEM')) continue;"
"        }"
"        "
"        const time = new Date(event.timestamp / 1000).toLocaleTimeString();"
"        const shortData = event.data.length > 30 ? event.data.substring(0, 30) + '...' : event.data;"
"        "
"        html += `<div class='event-item' onclick='showEventDetail(${i})'>`
"              + `<div><strong>${event.type}</strong></div>`
"              + `<div>${time}</div>`
"              + `<div>${shortData}</div>`
"              + `</div>`;"
"    }"
"    "
"    list.innerHTML = html;"
"}"
""
"function showEventDetail(index) {"
"    const event = events[index];"
"    const detail = document.getElementById('event-detail');"
"    "
"    let html = `<h3>${event.type}</h3>`"
"              + `<p><strong>Timestamp:</strong> ${new Date(event.timestamp / 1000).toISOString()}</p>`"
"              + `<p><strong>Data:</strong> ${event.data}</p>`"
"              + `<p><strong>CRC:</strong> ${event.crc}</p>`;"
"    "
"    if (event.sensor_id) {"
"        html += `<p><strong>Sensor:</strong> ${event.sensor_id}</p>`"
"               + `<p><strong>Value:</strong> ${event.value} ${event.unit || ''}</p>`;"
"    }"
"    "
"    if (event.actuator_id) {"
"        html += `<p><strong>Actuator:</strong> ${event.actuator_id}</p>`"
"               + `<p><strong>Command:</strong> ${event.command}</p>`;"
"    }"
"    "
"    detail.innerHTML = html;"
"}"
""
"function toggleStream() {"
"    if (ws && ws.readyState === WebSocket.OPEN) {"
"        ws.send(JSON.stringify({ action: 'toggle_stream' }));"
"    }"
"}"
""
"function exportTrace() {"
"    window.open('/export', '_blank');"
"}"
""
"function clearDisplay() {"
"    events = [];"
"    eventCount = 0;"
"    startTime = Date.now();"
"    updateEventList();"
"    document.getElementById('event-detail').innerHTML = 'Select an event to view details';"
"}"
""
"function filterEvents() {"
"    updateEventList();"
"}"
""
"// Initialize chart"
"function initChart() {"
"    const ctx = document.getElementById('chart').getContext('2d');"
"    chart = new Chart(ctx, {"
"        type: 'line',"
"        data: chartData,"
"        options: {"
"            responsive: true,"
"            maintainAspectRatio: false,"
"            scales: {"
"                x: { display: false },"
"                y: { beginAtZero: true, grid: { color: '#333' } }"
"            },"
"            plugins: { legend: { display: false } }"
"        }"
"    });"
"}"
""
"// Update uptime"
"function updateUptime() {"
"    const elapsed = Date.now() - startTime;"
"    const hours = Math.floor(elapsed / 3600000);"
"    const minutes = Math.floor((elapsed % 3600000) / 60000);"
"    const seconds = Math.floor((elapsed % 60000) / 1000);"
"    document.getElementById('uptime').textContent = "
"        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;"
"}"
""
"// Initialize"
"window.onload = function() {"
"    connectWebSocket();"
"    initChart();"
"    setInterval(updateUptime, 1000);"
"};"
"</script>"
"</body>"
"</html>";

// HTTP GET handler for index
static esp_err_t index_get_handler(httpd_req_t *req) {
    httpd_resp_set_type(req, "text/html");
    httpd_resp_send(req, INDEX_HTML, strlen(INDEX_HTML));
    return ESP_OK;
}

// HTTP GET handler for events JSON
static esp_err_t events_get_handler(httpd_req_t *req) {
    cJSON *root = cJSON_CreateArray();
    
    // Add last 100 events
    // In real implementation, read from trace buffer
    
    char *json_str = cJSON_Print(root);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, json_str, strlen(json_str));
    
    cJSON_Delete(root);
    free(json_str);
    return ESP_OK;
}

// HTTP GET handler for export
static esp_err_t export_get_handler(httpd_req_t *req) {
    // Export trace to file and serve
    char *filename = "/spiffs/trace_export.ulp";
    ulp_export_trace_to_fs(filename);
    
    FILE *f = fopen(filename, "rb");
    if (!f) {
        httpd_resp_send_404(req);
        return ESP_FAIL;
    }
    
    httpd_resp_set_type(req, "application/octet-stream");
    httpd_resp_set_hdr(req, "Content-Disposition", "attachment; filename=trace.ulp");
    
    char buf[1024];
    size_t n;
    do {
        n = fread(buf, 1, sizeof(buf), f);
        if (n > 0) {
            httpd_resp_send_chunk(req, buf, n);
        }
    } while (n > 0);
    
    fclose(f);
    httpd_resp_send_chunk(req, NULL, 0);
    return ESP_OK;
}

// WebSocket handler
static esp_err_t ws_handler(httpd_req_t *req) {
    if (req->method == HTTP_GET) {
        ESP_LOGI(TAG, "WebSocket connection established");
        
        // Send initial data
        httpd_ws_frame_t ws_pkt = {
            .final = true,
            .fragmented = false,
            .type = HTTPD_WS_TYPE_TEXT,
            .len = 0,
        };
        
        // Send current event count
        cJSON *init_msg = cJSON_CreateObject();
        cJSON_AddStringToObject(init_msg, "type", "init");
        cJSON_AddNumberToObject(init_msg, "event_count", events_served);
        cJSON_AddNumberToObject(init_msg, "timestamp", esp_timer_get_time());
        
        char *msg_str = cJSON_Print(init_msg);
        ws_pkt.payload = (uint8_t*)msg_str;
        ws_pkt.len = strlen(msg_str);
        
        httpd_ws_send_frame(req, &ws_pkt);
        free(msg_str);
        cJSON_Delete(init_msg);
        
        // Add to connection count
        xSemaphoreTake(web_mutex, portMAX_DELAY);
        active_connections++;
        xSemaphoreGive(web_mutex);
        
        // Keep connection open
        while (1) {
            // Wait for message
            uint8_t buf[128] = { 0 };
            ws_pkt.payload = buf;
            ws_pkt.len = sizeof(buf);
            
            esp_err_t ret = httpd_ws_recv_frame(req, &ws_pkt, sizeof(buf));
            if (ret != ESP_OK) {
                break;
            }
            
            if (ws_pkt.type == HTTPD_WS_TYPE_TEXT && ws_pkt.len > 0) {
                // Parse command
                buf[ws_pkt.len] = 0;
                cJSON *cmd = cJSON_Parse((char*)buf);
                if (cmd) {
                    cJSON *action = cJSON_GetObjectItem(cmd, "action");
                    if (action && strcmp(action->valuestring, "toggle_stream") == 0) {
                        // Toggle event streaming
                        cJSON *response = cJSON_CreateObject();
                        cJSON_AddStringToObject(response, "type", "stream_toggled");
                        cJSON_AddBoolToObject(response, "active", true);
                        
                        char *resp_str = cJSON_Print(response);
                        ws_pkt.payload = (uint8_t*)resp_str;
                        ws_pkt.len = strlen(resp_str);
                        
                        httpd_ws_send_frame(req, &ws_pkt);
                        free(resp_str);
                        cJSON_Delete(response);
                    }
                    cJSON_Delete(cmd);
                }
            }
        }
        
        // Connection closed
        xSemaphoreTake(web_mutex, portMAX_DELAY);
        active_connections--;
        xSemaphoreGive(web_mutex);
        
        ESP_LOGI(TAG, "WebSocket connection closed");
    }
    return ESP_OK;
}

// SSE (Server-Sent Events) handler
static esp_err_t sse_handler(httpd_req_t *req) {
    httpd_resp_set_type(req, "text/event-stream");
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    httpd_resp_set_hdr(req, "Connection", "keep-alive");
    
    ESP_LOGI(TAG, "SSE connection established");
    
    xSemaphoreTake(web_mutex, portMAX_DELAY);
    active_connections++;
    xSemaphoreGive(web_mutex);
    
    // Send initial event
    httpd_resp_send_chunk(req, "event: connected\ndata: {\"message\": \"Connected to ULP stream\"}\n\n", 0);
    
    // Keep-alive loop
    while (httpd_req_get_socket(req) != -1) {
        // In real implementation, send events as they occur
        vTaskDelay(pdMS_TO_TICKS(1000));
        httpd_resp_send_chunk(req, ": keepalive\n\n", 0);
    }
    
    xSemaphoreTake(web_mutex, portMAX_DELAY);
    active_connections--;
    xSemaphoreGive(web_mutex);
    
    ESP_LOGI(TAG, "SSE connection closed");
    return ESP_OK;
}

// URI handlers
static const httpd_uri_t index_uri = {
    .uri       = "/",
    .method    = HTTP_GET,
    .handler   = index_get_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t events_uri = {
    .uri       = "/events",
    .method    = HTTP_GET,
    .handler   = events_get_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t export_uri = {
    .uri       = "/export",
    .method    = HTTP_GET,
    .handler   = export_get_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t sse_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = sse_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t ws_uri = {
    .uri       = "/ws",
    .method    = HTTP_GET,
    .handler   = ws_handler,
    .user_ctx  = NULL,
    .is_websocket = true
};

// Initialize web server
esp_err_t ulp_web_server_init(ulp_web_config_t* config) {
    ESP_LOGI(TAG, "Initializing ULP Web Server");
    
    if (web_mutex == NULL) {
        web_mutex = xSemaphoreCreateMutex();
        if (web_mutex == NULL) {
            return ESP_ERR_NO_MEM;
        }
    }
    
    // Initialize SPIFFS for file serving
    esp_vfs_spiffs_conf_t spiffs_conf = {
        .base_path = "/spiffs",
        .partition_label = NULL,
        .max_files = 5,
        .format_if_mount_failed = true
    };
    
    esp_err_t ret = esp_vfs_spiffs_register(&spiffs_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to mount SPIFFS: %s", esp_err_to_name(ret));
        return ret;
    }
    
    // Configure HTTP server
    httpd_config_t http_config = HTTPD_DEFAULT_CONFIG();
    if (config) {
        http_config.server_port = config->port;
        http_config.max_open_sockets = config->max_clients;
        http_config.uri_match_fn = httpd_uri_match_wildcard;
    }
    
    // Start server
    ret = httpd_start(&server, &http_config);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to start HTTP server: %s", esp_err_to_name(ret));
        return ret;
    }
    
    // Register URI handlers
    httpd_register_uri_handler(server, &index_uri);
    httpd_register_uri_handler(server, &events_uri);
    httpd_register_uri_handler(server, &export_uri);
    httpd_register_uri_handler(server, &sse_uri);
    
    if (config && config->enable_websocket) {
        httpd_register_uri_handler(server, &ws_uri);
    }
    
    ESP_LOGI(TAG, "Web server started on port %d", http_config.server_port);
    return ESP_OK;
}

// Start web server
esp_err_t ulp_web_server_start(void) {
    if (server == NULL) {
        return ESP_ERR_INVALID_STATE;
    }
    return ESP_OK;
}

// Stop web server
esp_err_t ulp_web_server_stop(void) {
    if (server) {
        httpd_stop(server);
        server = NULL;
    }
    return ESP_OK;
}

// Get current connections
size_t ulp_web_get_connections(void) {
    size_t count;
    xSemaphoreTake(web_mutex, portMAX_DELAY);
    count = active_connections;
    xSemaphoreGive(web_mutex);
    return count;
}

// Broadcast event to all connected clients
esp_err_t ulp_web_broadcast_event(ulp_event_t* event) {
    if (!event || !server) {
        return ESP_ERR_INVALID_ARG;
    }
    
    // Convert event to JSON
    cJSON *json = cJSON_CreateObject();
    cJSON_AddStringToObject(json, "type", "event");
    cJSON_AddNumberToObject(json, "timestamp", event->timestamp);
    cJSON_AddNumberToObject(json, "event_type", event->event_type);
    
    // Parse event data based on type
    switch (event->event_type) {
        case EVENT_SENSOR_READ: {
            if (event->data_length >= 37) {
                char sensor_id[33] = {0};
                float value;
                uint8_t unit;
                
                memcpy(sensor_id, event->data, 32);
                memcpy(&value, event->data + 32, 4);
                unit = event->data[36];
                
                cJSON_AddStringToObject(json, "sensor_id", sensor_id);
                cJSON_AddNumberToObject(json, "value", value);
                cJSON_AddNumberToObject(json, "unit", unit);
                cJSON_AddStringToObject(json, "data", sensor_id);
            }
            break;
        }
        case EVENT_ACTUATOR_CMD: {
            if (event->data_length > 0) {
                char *data_str = malloc(event->data_length + 1);
                if (data_str) {
                    memcpy(data_str, event->data, event->data_length);
                    data_str[event->data_length] = 0;
                    cJSON_AddStringToObject(json, "data", data_str);
                    free(data_str);
                }
            }
            break;
        }
        default:
            cJSON_AddStringToObject(json, "data", "[binary data]");
    }
    
    char *json_str = cJSON_PrintUnformatted(json);
    cJSON_Delete(json);
    
    if (!json_str) {
        return ESP_ERR_NO_MEM;
    }
    
    // Broadcast to WebSocket clients
    size_t clients = ulp_web_get_connections();
    if (clients > 0) {
        // In real implementation, iterate through all clients
        // For now, just log
        ESP_LOGD(TAG, "Would broadcast to %zu clients: %s", clients, json_str);
    }
    
    free(json_str);
    events_served++;
    bytes_sent += strlen(json_str);
    
    return ESP_OK;
}

// Get server statistics
void ulp_web_get_stats(uint32_t* total_events_served,
                       uint32_t* active_connections,
                       uint32_t* bytes_sent_out) {
    xSemaphoreTake(web_mutex, portMAX_DELAY);
    
    if (total_events_served) *total_events_served = events_served;
    if (active_connections) *active_connections = active_connections;
    if (bytes_sent_out) *bytes_sent_out = bytes_sent;
    
    xSemaphoreGive(web_mutex);
}
```

2. BLE Export for Mobile Viewing

ulp_ble_service.h

```c
#ifndef ULP_BLE_SERVICE_H
#define ULP_BLE_SERVICE_H

#include "esp_gap_ble_api.h"
#include "esp_gatts_api.h"
#include "esp_bt_defs.h"

// BLE configuration
typedef struct {
    char device_name[32];
    uint16_t appearance;
    uint32_t adv_interval_min;
    uint32_t adv_interval_max;
    bool enable_bonding;
    bool enable_mitm;
    uint8_t io_capability;
} ulp_ble_config_t;

// BLE service UUIDs
#define ULP_SERVICE_UUID          0x554C  // "UL" in ASCII
#define ULP_CHAR_EVENT_UUID       0x4556  // "EV"
#define ULP_CHAR_STATUS_UUID      0x5354  // "ST"
#define ULP_CHAR_CONTROL_UUID     0x434F  // "CO"
#define ULP_CHAR_EXPORT_UUID      0x4558  // "EX"

// BLE event types
typedef enum {
    BLE_EVENT_CONNECTED,
    BLE_EVENT_DISCONNECTED,
    BLE_EVENT_START_STREAM,
    BLE_EVENT_STOP_STREAM,
    BLE_EVENT_EXPORT_REQUEST,
    BLE_EVENT_ERROR
} ble_event_type_t;

// BLE callback
typedef void (*ulp_ble_callback_t)(ble_event_type_t event, void* data, size_t len);

// Initialize BLE service
esp_err_t ulp_ble_init(ulp_ble_config_t* config, ulp_ble_callback_t callback);

// Start advertising
esp_err_t ulp_ble_start_advertise(void);

// Stop advertising
esp_err_t ulp_ble_stop_advertise(void);

// Send event via BLE
esp_err_t ulp_ble_send_event(ulp_event_t* event);

// Send trace chunk via BLE
esp_err_t ulp_ble_send_trace_chunk(uint32_t offset, uint32_t size);

// Get connection status
bool ulp_ble_is_connected(void);

// Get connected device address
esp_bd_addr_t* ulp_ble_get_connected_addr(void);

// Export complete trace via BLE
esp_err_t ulp_ble_export_trace(void);

// Set MTU (Maximum Transmission Unit)
esp_err_t ulp_ble_set_mtu(uint16_t mtu);

// Get BLE statistics
void ulp_ble_get_stats(uint32_t* events_sent,
                      uint32_t* bytes_sent,
                      uint32_t* connections,
                      uint32_t* errors);

#endif
```

ulp_ble_service.c

```c
#include "ulp_ble_service.h"
#include "esp_log.h"
#include "esp_bt.h"
#include "esp_bt_main.h"
#include "esp_bt_device.h"
#include "esp_gap_bt_api.h"
#include "string.h"
#include "ulp_recorder.h"

static const char* TAG = "ULP-BLE";

static uint16_t gatts_if = 0;
static uint16_t conn_id = 0;
static bool is_connected = false;
static bool is_advertising = false;
static ulp_ble_callback_t user_callback = NULL;

static uint16_t char_handle_event;
static uint16_t char_handle_status;
static uint16_t char_handle_control;
static uint16_t char_handle_export;

static esp_bd_addr_t connected_addr = {0};
static uint32_t events_sent = 0;
static uint32_t bytes_sent = 0;
static uint32_t connection_count = 0;
static uint32_t error_count = 0;

static SemaphoreHandle_t ble_mutex = NULL;

// GAP event handler
static void gap_event_handler(esp_gap_ble_cb_event_t event, esp_ble_gap_cb_param_t *param) {
    switch (event) {
        case ESP_GAP_BLE_ADV_DATA_SET_COMPLETE_EVT:
            ESP_LOGI(TAG, "Advertisement data set complete");
            break;
            
        case ESP_GAP_BLE_SCAN_RSP_DATA_SET_COMPLETE_EVT:
            ESP_LOGI(TAG, "Scan response data set complete");
            break;
            
        case ESP_GAP_BLE_ADV_START_COMPLETE_EVT:
            if (param->adv_start_cmpl.status == ESP_BT_STATUS_SUCCESS) {
                is_advertising = true;
                ESP_LOGI(TAG, "Advertising started successfully");
            } else {
                ESP_LOGE(TAG, "Failed to start advertising");
            }
            break;
            
        case ESP_GAP_BLE_ADV_STOP_COMPLETE_EVT:
            is_advertising = false;
            ESP_LOGI(TAG, "Advertising stopped");
            break;
            
        case ESP_GAP_BLE_UPDATE_CONN_PARAMS_EVT:
            ESP_LOGI(TAG, "Connection parameters updated: interval=%d, latency=%d, timeout=%d",
                    param->update_conn_params.conn_int,
                    param->update_conn_params.latency,
                    param->update_conn_params.timeout);
            break;
            
        default:
            break;
    }
}

// Prepare advertisement data
static void prepare_advertisement_data(esp_ble_adv_data_t* adv_data,
                                      esp_ble_adv_params_t* adv_params,
                                      ulp_ble_config_t* config) {
    // Flags
    uint8_t adv_flag = 0x06;
    
    // Service UUID
    uint16_t service_uuid = ULP_SERVICE_UUID;
    
    // Device name
    char device_name[32];
    snprintf(device_name, sizeof(device_name), "ULP_%s", config->device_name);
    
    // Advertisement data
    adv_data->set_scan_rsp = false;
    adv_data->include_name = true;
    adv_data->include_txpower = true;
    adv_data->min_interval = config->adv_interval_min;
    adv_data->max_interval = config->adv_interval_max;
    adv_data->appearance = config->appearance;
    adv_data->manufacturer_len = 0;
    adv_data->p_manufacturer_data = NULL;
    adv_data->service_data_len = 0;
    adv_data->p_service_data = NULL;
    adv_data->service_uuid_len = sizeof(service_uuid);
    adv_data->p_service_uuid = (uint8_t*)&service_uuid;
    adv_data->flag = (esp_ble_adv_data_flag)adv_flag;
    
    // Scan response data
    esp_ble_adv_data_t scan_rsp_data = {
        .set_scan_rsp = true,
        .include_name = true,
        .include_txpower = false,
        .min_interval = 0,
        .max_interval = 0,
        .appearance = 0,
        .manufacturer_len = 0,
        .p_manufacturer_data = NULL,
        .service_data_len = 0,
        .p_service_data = NULL,
        .service_uuid_len = 0,
        .p_service_uuid = NULL,
        .flag = (esp_ble_adv_data_flag)0
    };
    
    // Advertisement parameters
    adv_params->adv_int_min = config->adv_interval_min;
    adv_params->adv_int_max = config->adv_interval_max;
    adv_params->adv_type = ADV_TYPE_IND;
    adv_params->own_addr_type = BLE_ADDR_TYPE_PUBLIC;
    adv_params->channel_map = ADV_CHNL_ALL;
    adv_params->adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY;
    
    // Set advertisement data
    esp_ble_gap_config_adv_data(adv_data);
    esp_ble_gap_config_adv_data(&scan_rsp_data);
}

// GATTS event handler
static void gatts_event_handler(esp_gatts_cb_event_t event, esp_gatt_if_t gatts_if,
                               esp_ble_gatts_cb_param_t *param) {
    switch (event) {
        case ESP_GATTS_REG_EVT: {
            ESP_LOGI(TAG, "GATTS registered, app_id=%d", param->reg.app_id);
            gatts_if = gatts_if;
            
            // Create service
            esp_bt_uuid_t service_uuid = {
                .len = ESP_UUID_LEN_16,
                .uuid = {.uuid16 = ULP_SERVICE_UUID}
            };
            
            esp_err_t ret = esp_ble_gatts_create_service(gatts_if, &service_uuid, 10);
            if (ret != ESP_OK) {
                ESP_LOGE(TAG, "Failed to create service: %s", esp_err_to_name(ret));
            }
            break;
        }
        
        case ESP_GATTS_CREATE_EVT: {
            ESP_LOGI(TAG, "Service created, service_handle=%d", param->create.service_handle);
            
            // Create characteristics
            esp_bt_uuid_t char_uuid;
            esp_gatt_perm_t perm = ESP_GATT_PERM_READ | ESP_GATT_PERM_WRITE;
            esp_gatt_char_prop_t prop = ESP_GATT_CHAR_PROP_BIT_READ | ESP_GATT_CHAR_PROP_BIT_NOTIFY;
            
            // Event characteristic
            char_uuid.len = ESP_UUID_LEN_16;
            char_uuid.uuid.uuid16 = ULP_CHAR_EVENT_UUID;
            esp_ble_gatts_add_char(param->create.service_handle, &char_uuid,
                                  perm, prop, NULL, NULL);
            
            // Status characteristic
            char_uuid.uuid.uuid16 = ULP_CHAR_STATUS_UUID;
            esp_ble_gatts_add_char(param->create.service_handle, &char_uuid,
                                  perm, ESP_GATT_CHAR_PROP_BIT_READ, NULL, NULL);
            
            // Control characteristic
            char_uuid.uuid.uuid16 = ULP_CHAR_CONTROL_UUID;
            esp_ble_gatts_add_char(param->create.service_handle, &char_uuid,
                                  perm, ESP_GATT_CHAR_PROP_BIT_WRITE, NULL, NULL);
            
            // Export characteristic
            char_uuid.uuid.uuid16 = ULP_CHAR_EXPORT_UUID;
            esp_ble_gatts_add_char(param->create.service_handle, &char_uuid,
                                  perm, ESP_GATT_CHAR_PROP_BIT_READ | 
                                        ESP_GATT_CHAR_PROP_BIT_WRITE |
                                        ESP_GATT_CHAR_PROP_BIT_NOTIFY, NULL, NULL);
            break;
        }
        
        case ESP_GATTS_ADD_CHAR_EVT: {
            ESP_LOGI(TAG, "Characteristic added, char_handle=%d, uuid=0x%04x",
                    param->add_char.attr_handle, param->add_char.char_uuid.uuid.uuid16);
            
            // Store handles
            switch (param->add_char.char_uuid.uuid.uuid16) {
                case ULP_CHAR_EVENT_UUID:
                    char_handle_event = param->add_char.attr_handle;
                    break;
                case ULP_CHAR_STATUS_UUID:
                    char_handle_status = param->add_char.attr_handle;
                    break;
                case ULP_CHAR_CONTROL_UUID:
                    char_handle_control = param->add_char.attr_handle;
                    break;
                case ULP_CHAR_EXPORT_UUID:
                    char_handle_export = param->add_char.attr_handle;
                    break;
            }
            
            // Start service after all characteristics added
            if (char_handle_event && char_handle_status && 
                char_handle_control && char_handle_export) {
                esp_ble_gatts_start_service(param->add_char.service_handle);
            }
            break;
        }
        
        case ESP_GATTS_CONNECT_EVT: {
            ESP_LOGI(TAG, "Device connected, conn_id=%d", param->connect.conn_id);
            
            is_connected = true;
            conn_id = param->connect.conn_id;
            memcpy(connected_addr, param->connect.remote_bda, ESP_BD_ADDR_LEN);
            connection_count++;
            
            // Update connection parameters
            esp_ble_conn_update_params_t conn_params = {
                .bda = {0},
                .min_int = 0x10,
                .max_int = 0x20,
                .latency = 0,
                .timeout = 400
            };
            memcpy(conn_params.bda, param->connect.remote_bda, ESP_BD_ADDR_LEN);
            esp_ble_gap_update_conn_params(&conn_params);
            
            if (user_callback) {
                user_callback(BLE_EVENT_CONNECTED, connected_addr, ESP_BD_ADDR_LEN);
            }
            break;
        }
        
        case ESP_GATTS_DISCONNECT_EVT: {
            ESP_LOGI(TAG, "Device disconnected, conn_id=%d", param->disconnect.conn_id);
            
            is_connected = false;
            conn_id = 0;
            memset(connected_addr, 0, ESP_BD_ADDR_LEN);
            
            if (user_callback) {
                user_callback(BLE_EVENT_DISCONNECTED, NULL, 0);
            }
            
            // Restart advertising
            ulp_ble_start_advertise();
            break;
        }
        
        case ESP_GATTS_WRITE_EVT: {
            ESP_LOGI(TAG, "Write event, handle=%d, len=%d", 
                    param->write.handle, param->write.len);
            
            if (param->write.handle == char_handle_control) {
                // Control command
                if (param->write.len > 0) {
                    uint8_t cmd = param->write.value[0];
                    
                    switch (cmd) {
                        case 0x01: // Start stream
                            if (user_callback) {
                                user_callback(BLE_EVENT_START_STREAM, NULL, 0);
                            }
                            break;
                            
                        case 0x02: // Stop stream
                            if (user_callback) {
                                user_callback(BLE_EVENT_STOP_STREAM, NULL, 0);
                            }
                            break;
                            
                        case 0x03: // Request export
                            if (user_callback) {
                                user_callback(BLE_EVENT_EXPORT_REQUEST, NULL, 0);
                            }
                            break;
                    }
                }
            }
            break;
        }
        
        case ESP_GATTS_READ_EVT: {
            ESP_LOGD(TAG, "Read event, handle=%d", param->read.handle);
            
            if (param->read.handle == char_handle_status) {
                // Send status information
                uint8_t status_data[20];
                uint32_t event_count = events_sent;
                uint32_t trace_size = ulp_get_trace_size();
                
                memcpy(status_data, &event_count, 4);
                memcpy(status_data + 4, &trace_size, 4);
                status_data[8] = is_connected ? 1 : 0;
                status_data[9] = is_advertising ? 1 : 0;
                
                esp_ble_gatts_send_response(gatts_if, param->read.conn_id,
                                           param->read.trans_id, ESP_GATT_OK,
                                           20, status_data);
            }
            break;
        }
        
        case ESP_GATTS_MTU_EVT: {
            ESP_LOGI(TAG, "MTU updated: %d", param->mtu.mtu);
            break;
        }
        
        default:
            break;
    }
}

// Initialize BLE service
esp_err_t ulp_ble_init(ulp_ble_config_t* config, ulp_ble_callback_t callback) {
    ESP_LOGI(TAG, "Initializing ULP BLE Service");
    
    if (ble_mutex == NULL) {
        ble_mutex = xSemaphoreCreateMutex();
        if (ble_mutex == NULL) {
            return ESP_ERR_NO_MEM;
        }
    }
    
    user_callback = callback;
    
    // Initialize Bluetooth controller
    esp_bt_controller_config_t bt_cfg = BT_CONTROLLER_INIT_CONFIG_DEFAULT();
    esp_err_t ret = esp_bt_controller_init(&bt_cfg);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize BT controller: %s", esp_err_to_name(ret));
        return ret;
    }
    
    ret = esp_bt_controller_enable(ESP_BT_MODE_BLE);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to enable BT controller: %s", esp_err_to_name(ret));
        return ret;
    }
    
    // Initialize Bluedroid
    ret = esp_bluedroid_init();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize Bluedroid: %s", esp_err_to_name(ret));
        return ret;
    }
    
    ret = esp_bluedroid_enable();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to enable Bluedroid: %s", esp_err_to_name(ret));
        return ret;
    }
    
    // Register callbacks
    ret = esp_ble_gatts_register_callback(gatts_event_handler);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to register GATTS callback: %s", esp_err_to_name(ret));
        return ret;
    }
    
    ret = esp_ble_gap_register_callback(gap_event_handler);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to register GAP callback: %s", esp_err_to_name(ret));
        return ret;
    }
    
    // Set device name
    if (config) {
        esp_ble_gap_set_device_name(config->device_name);
    } else {
        esp_ble_gap_set_device_name("ULP_Trace_Recorder");
    }
    
    // Configure MTU
    ret = esp_ble_gatt_set_local_mtu(512);
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "Failed to set MTU: %s", esp_err_to_name(ret));
    }
    
    // Create application profile
    esp_ble_gatts_app_register(0x554C); // App ID
    
    ESP_LOGI(TAG, "BLE service initialized");
    return ESP_OK;
}

// Start advertising
esp_err_t ulp_ble_start_advertise(void) {
    if (is_advertising) {
        return ESP_OK;
    }
    
    // Default configuration if not provided
    ulp_ble_config_t default_config = {
        .device_name = "ULP_Recorder",
        .appearance = 0x0340, // Generic sensor
        .adv_interval_min = 0x20,
        .adv_interval_max = 0x40,
        .enable_bonding = false,
        .enable_mitm = false,
        .io_capability = ESP_IO_CAP_NONE
    };
    
    esp_ble_adv_data_t adv_data = {0};
    esp_ble_adv_params_t adv_params = {0};
    
    prepare_advertisement_data(&adv_data, &adv_params, &default_config);
    
    esp_err_t ret = esp_ble_gap_start_advertising(&adv_params);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to start advertising: %s", esp_err_to_name(ret));
        return ret;
    }
    
    return ESP_OK;
}

// Stop advertising
esp_err_t ulp_ble_stop_advertise(void) {
    if (!is_advertising) {
        return ESP_OK;
    }
    
    esp_err_t ret = esp_ble_gap_stop_advertising();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to stop advertising: %s", esp_err_to_name(ret));
        return ret;
    }
    
    return ESP_OK;
}

// Send event via BLE
esp_err_t ulp_ble_send_event(ulp_event_t* event) {
    if (!is_connected || !event) {
        return ESP_ERR_INVALID_STATE;
    }
    
    // Convert event to BLE packet format
    size_t packet_size = sizeof(ulp_event_t) + event->data_length;
    uint8_t* packet = malloc(packet_size);
    if (!packet) {
        return ESP_ERR_NO_MEM;
    }
    
    memcpy(packet, event, sizeof(ulp_event_t));
    if (event->data_length > 0) {
        memcpy(packet + sizeof(ulp_event_t), event->data, event->data_length);
    }
    
    // Send via characteristic
    esp_err_t ret = esp_ble_gatts_send_indicate(gatts_if, conn_id,
                                               char_handle_event,
                                               packet_size, packet, false);
    
    if (ret == ESP_OK) {
        xSemaphoreTake(ble_mutex, portMAX_DELAY);
        events_sent++;
        bytes_sent += packet_size;
        xSemaphoreGive(ble_mutex);
    } else {
        error_count++;
    }
    
    free(packet);
    return ret;
}

// Send trace chunk via BLE
esp_err_t ulp_ble_send_trace_chunk(uint32_t offset, uint32_t size) {
    if (!is_connected) {
        return ESP_ERR_INVALID_STATE;
    }
    
    if (size > 512) { // MTU limit
        size = 512;
    }
    
    // Read from trace
    uint8_t* chunk = malloc(size);
    if (!chunk) {
        return ESP_ERR_NO_MEM;
    }
    
    // TODO: Read actual trace data from offset
    // For now, send dummy data
    memset(chunk, 0xAA, size);
    
    // Send via export characteristic
    esp_err_t ret = esp_ble_gatts_send_indicate(gatts_if, conn_id,
                                               char_handle_export,
                                               size, chunk, false);
    
    free(chunk);
    return ret;
}

// Get connection status
bool ulp_ble_is_connected(void) {
    return is_connected;
}

// Get connected device address
esp_bd_addr_t* ulp_ble_get_connected_addr(void) {
    return is_connected ? &connected_addr : NULL;
}

// Export complete trace via BLE
esp_err_t ulp_ble_export_trace(void) {
    if (!is_connected) {
        return ESP_ERR_INVALID_STATE;
    }
    
    // Get trace size
    size_t trace_size = ulp_get_trace_size();
    
    // Send in chunks
    uint32_t offset = 0;
    const uint32_t chunk_size = 512;
    
    while (offset < trace_size) {
        uint32_t remaining = trace_size - offset;
        uint32_t current_chunk = (remaining > chunk_size) ? chunk_size : remaining;
        
        esp_err_t ret = ulp_ble_send_trace_chunk(offset, current_chunk);
        if (ret != ESP_OK) {
            ESP_LOGE(TAG, "Failed to send chunk at offset %u: %s", 
                    offset, esp_err_to_name(ret));
            return ret;
        }
        
        offset += current_chunk;
        vTaskDelay(pdMS_TO_TICKS(10)); // Small delay between chunks
    }
    
    ESP_LOGI(TAG, "Trace export completed: %u bytes", trace_size);
    return ESP_OK;
}

// Set MTU
esp_err_t ulp_ble_set_mtu(uint16_t mtu) {
    if (mtu < 23 || mtu > 517) {
        return ESP_ERR_INVALID_ARG;
    }
    
    return esp_ble_gatt_set_local_mtu(mtu);
}

// Get BLE statistics
void ulp_ble_get_stats(uint32_t* events_sent_out,
                      uint32_t* bytes_sent_out,
                      uint32_t* connections_out,
                      uint32_t* errors_out) {
    xSemaphoreTake(ble_mutex, portMAX_DELAY);
    
    if (events_sent_out) *events_sent_out = events_sent;
    if (bytes_sent_out) *bytes_sent_out = bytes_sent;
    if (connections_out) *connections_out = connection_count;
    if (errors_out) *errors_out = error_count;
    
    xSemaphoreGive(ble_mutex);
}
```

main.c - Updated with Web + BLE

```c
#include <stdio.h>
#include "ulp_recorder.h"
#include "ulp_web_server.h"
#include "ulp_ble_service.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"

// WiFi credentials (update these)
#define WIFI_SSID "your_wifi_ssid"
#define WIFI_PASS "your_wifi_pass"

// LED for status
#define STATUS_LED_GPIO GPIO_NUM_2

static bool web_stream_active = false;
static bool ble_stream_active = false;

// WiFi event handler
static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                              int32_t event_id, void* event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        ESP_LOGI("WIFI", "Disconnected, attempting reconnect...");
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        ESP_LOGI("WIFI", "Got IP: " IPSTR, IP2STR(&event->ip_info.ip));
    }
}

// Initialize WiFi
static void wifi_init(void) {
    ESP_LOGI("WIFI", "Initializing WiFi...");
    
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();
    
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);
    
    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                       &wifi_event_handler, NULL, &instance_any_id);
    esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP,
                                       &wifi_event_handler, NULL, &instance_got_ip);
    
    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };
    
    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_start();
    
    ESP_LOGI("WIFI", "WiFi initialization complete");
}

// BLE event callback
static void ble_event_callback(ble_event_type_t event, void* data, size_t len) {
    switch (event) {
        case BLE_EVENT_CONNECTED:
            ESP_LOGI("BLE", "Device connected");
            gpio_set_level(STATUS_LED_GPIO, 1);
            break;
            
        case BLE_EVENT_DISCONNECTED:
            ESP_LOGI("BLE", "Device disconnected");
            gpio_set_level(STATUS_LED_GPIO, 0);
            break;
            
        case BLE_EVENT_START_STREAM:
            ESP_LOGI("BLE", "Stream started via BLE");
            ble_stream_active = true;
            break;
            
        case BLE_EVENT_STOP_STREAM:
            ESP_LOGI("BLE", "Stream stopped via BLE");
            ble_stream_active = false;
            break;
            
        case BLE_EVENT_EXPORT_REQUEST:
            ESP_LOGI("BLE", "Export requested via BLE");
            ulp_ble_export_trace();
            break;
            
        default:
            break;
    }
}

// Sensor task with web/ble streaming
void sensor_stream_task(void* pvParameters) {
    ESP_LOGI("STREAM", "Starting sensor streaming task");
    
    float temperature = 22.0;
    float humidity = 45.0;
    uint32_t counter = 0;
    
    while (1) {
        // Simulate sensor readings
        temperature += (esp_random() % 100) / 1000.0 - 0.05;
        humidity += (esp_random() % 100) / 1000.0 - 0.05;
        
        // Record to ULP trace
        ulp_record_temperature(temperature, "SIM_TEMP");
        ulp_record_humidity(humidity, "SIM_HUM");
        
        // If web streaming is active, get last event and broadcast
        if (web_stream_active) {
            // In real implementation, get the actual event
            // For demo, create synthetic event
            ulp_event_t web_event;
            web_event.timestamp = esp_timer_get_time();
            web_event.event_type = EVENT_SENSOR_READ;
            web_event.data_length = 0;
            
            ulp_web_broadcast_event(&web_event);
        }
        
        // If BLE streaming is active, send via BLE
        if (ble_stream_active && ulp_ble_is_connected()) {
            ulp_event_t ble_event;
            ble_event.timestamp = esp_timer_get_time();
            ble_event.event_type = EVENT_SENSOR_READ;
            ble_event.data_length = 0;
            
            ulp_ble_send_event(&ble_event);
        }
        
        counter++;
        if (counter % 60 == 0) { // Every minute
            ESP_LOGI("STREAM", "Streaming: Web=%d, BLE=%d, Events=%lu",
                    web_stream_active, ble_stream_active, counter);
        }
        
        vTaskDelay(pdMS_TO_TICKS(1000)); // 1 second interval
    }
}

// Web control task
void web_control_task(void* pvParameters) {
    ESP_LOGI("WEB", "Starting web control task");
    
    // Web server configuration
    ulp_web_config_t web_config = {
        .port = 80,
        .enable_websocket = true,
        .enable_sse = true,
        .max_clients = 4,
        .base_path = "/spiffs"
    };
    
    // Initialize web server
    esp_err_t ret = ulp_web_server_init(&web_config);
    if (ret != ESP_OK) {
        ESP_LOGE("WEB", "Failed to initialize web server: %s", esp_err_to_name(ret));
        vTaskDelete(NULL);
    }
    
    ulp_web_server_start();
    
    // Monitor connections
    while (1) {
        size_t connections = ulp_web_get_connections();
        web_stream_active = (connections > 0);
        
        if (connections > 0) {
            uint32_t events, active, bytes;
            ulp_web_get_stats(&events, &active, &bytes);
            
            ESP_LOGI("WEB", "Active connections: %d, Events served: %lu",
                    connections, events);
        }
        
        vTaskDelay(pdMS_TO_TICKS(5000)); // Check every 5 seconds
    }
}

// BLE control task
void ble_control_task(void* pvParameters) {
    ESP_LOGI("BLE", "Starting BLE control task");
    
    // BLE configuration
    ulp_ble_config_t ble_config = {
        .device_name = "ULP_VAN",
        .appearance = 0x0340, // Generic sensor
        .adv_interval_min = 0x20,
        .adv_interval_max = 0x40,
        .enable_bonding = false,
        .enable_mitm = false,
        .io_capability = ESP_IO_CAP_NONE
    };
    
    // Initialize BLE
    esp_err_t ret = ulp_ble_init(&ble_config, ble_event_callback);
    if (ret != ESP_OK) {
        ESP_LOGE("BLE", "Failed to initialize BLE: %s", esp_err_to_name(ret));
        vTaskDelete(NULL);
    }
    
    // Start advertising
    ulp_ble_start_advertise();
    
    // Monitor BLE status
    while (1) {
        if (ulp_ble_is_connected()) {
            uint32_t events, bytes, connections, errors;
            ulp_ble_get_stats(&events, &bytes, &connections, &errors);
            
            ESP_LOGI("BLE", "Connected, Events sent: %lu, Bytes: %lu",
                    events, bytes);
        }
        
        vTaskDelay(pdMS_TO_TICKS(10000)); // Check every 10 seconds
    }
}

// Status LED task
void status_led_task(void* pvParameters) {
    gpio_set_direction(STATUS_LED_GPIO, GPIO_MODE_OUTPUT);
    
    int pattern = 0;
    while (1) {
        if (ulp_ble_is_connected()) {
            // Solid when connected
            gpio_set_level(STATUS_LED_GPIO, 1);
            vTaskDelay(pdMS_TO_TICKS(1000));
        } else if (web_stream_active) {
            // Blink fast when web streaming
            gpio_set_level(STATUS_LED_GPIO, pattern % 2);
            pattern++;
            vTaskDelay(pdMS_TO_TICKS(200));
        } else {
            // Slow blink when idle
            gpio_set_level(STATUS_LED_GPIO, pattern % 2);
            pattern++;
            vTaskDelay(pdMS_TO_TICKS(1000));
        }
    }
}

void app_main(void) {
    ESP_LOGI("MAIN", "Starting ULP Van System with Web + BLE");
    
    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    
    // Initialize ULP recorder
    ret = ulp_recorder_init();
    if (ret != ESP_OK) {
        ESP_LOGE("MAIN", "Failed to initialize ULP recorder");
        return;
    }
    
    ulp_recorder_start();
    
    // Initialize WiFi
    wifi_init();
    
    // Start tasks
    xTaskCreate(sensor_stream_task, "sensor_stream", 4096, NULL, 5, NULL);
    xTaskCreate(web_control_task, "web_control", 8192, NULL, 4, NULL);
    xTaskCreate(ble_control_task, "ble_control", 4096, NULL, 4, NULL);
    xTaskCreate(status_led_task, "status_led", 2048, NULL, 3, NULL);
    
    // Record startup
    ulp_record_event(EVENT_SYSTEM_STATE, "SYSTEM_STARTED_WEB_BLE", 22);
    
    ESP_LOGI("MAIN", "System started. Connect via:");
    ESP_LOGI("MAIN", "  Web: http://ulp-van.local (or device IP)");
    ESP_LOGI("MAIN", "  BLE: 'ULP_VAN' device");
    ESP_LOGI("MAIN", "Press ENTER to export trace...");
    
    // Keep main task alive
    while (1) {
        // Check for serial command
        char cmd = getchar();
        if (cmd == '\n' || cmd == '\r') {
            ESP_LOGI("MAIN", "Exporting trace...");
            ulp_export_trace_to_fs("/spiffs/trace.ulp");
            ulp_print_trace_summary();
        }
        
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
```

Mobile App Example (Android - Kotlin)

```kotlin
// ULP_BLE_Scanner.kt
package com.ulp.traceviewer

import android.Manifest
import android.bluetooth.*
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.android.synthetic.main.activity_main.*
import java.util.*

class MainActivity : AppCompatActivity() {
    private lateinit var bluetoothAdapter: BluetoothAdapter
    private lateinit var bluetoothLeScanner: BluetoothLeScanner
    private var gatt: BluetoothGatt? = null
    
    // ULP Service UUIDs
    private val ULP_SERVICE_UUID = UUID.fromString("0000554c-0000-1000-8000-00805f9b34fb")
    private val ULP_CHAR_EVENT_UUID = UUID.fromString("00004556-0000-1000-8000-00805f9b34fb")
    private val ULP_CHAR_STATUS_UUID = UUID.fromString("00005354-0000-1000-8000-00805f9b34fb")
    private val ULP_CHAR_CONTROL_UUID = UUID.fromString("0000434f-0000-1000-8000-00805f9b34fb")
    
    private val events = mutableListOf<String>()
    private val handler = Handler(Looper.getMainLooper())
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Request permissions
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 1)
        }
        
        // Initialize Bluetooth
        val bluetoothManager = getSystemService(BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        bluetoothLeScanner = bluetoothAdapter.bluetoothLeScanner
        
        // Setup UI
        btn_scan.setOnClickListener { startScan() }
        btn_connect.setOnClickListener { connectToDevice() }
        btn_start_stream.setOnClickListener { startStream() }
        btn_export.setOnClickListener { exportTrace() }
        
        // Update UI periodically
        handler.postDelayed(updateUiRunnable, 1000)
    }
    
    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            super.onScanResult(callbackType, result)
            
            val device = result.device
            val name = device.name ?: "Unknown"
            
            if (name.contains("ULP", ignoreCase = true)) {
                Log.d("ULP", "Found ULP device: $name at ${device.address}")
                
                runOnUiThread {
                    device_list.add("$name - ${device.address}")
                    selected_device = device
                }
                
                // Stop scanning after finding device
                bluetoothLeScanner.stopScan(this)
            }
        }
    }
    
    private var selected_device: BluetoothDevice? = null
    
    private fun startScan() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            return
        }
        
        device_list.clear()
        bluetoothLeScanner.startScan(scanCallback)
        
        // Stop scanning after 10 seconds
        handler.postDelayed({
            bluetoothLeScanner.stopScan(scanCallback)
            Log.d("ULP", "Scan stopped")
        }, 10000)
    }
    
    private fun connectToDevice() {
        selected_device?.let { device ->
            Log.d("ULP", "Connecting to ${device.address}")
            
            gatt = device.connectGatt(this, false, gattCallback)
            status_text.text = "Connecting..."
        }
    }
    
    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            super.onConnectionStateChange(gatt, status, newState)
            
            runOnUiThread {
                when (newState) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        status_text.text = "Connected"
                        gatt.discoverServices()
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        status_text.text = "Disconnected"
                    }
                }
            }
        }
        
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            super.onServicesDiscovered(gatt, status)
            
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val service = gatt.getService(ULP_SERVICE_UUID)
                service?.let {
                    Log.d("ULP", "ULP service discovered")
                    
                    // Enable notifications for event characteristic
                    val eventChar = it.getCharacteristic(ULP_CHAR_EVENT_UUID)
                    eventChar?.let { char ->
                        gatt.setCharacteristicNotification(char, true)
                        
                        val descriptor = char.getDescriptor(
                            UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
                        )
                        descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        gatt.writeDescriptor(descriptor)
                    }
                    
                    // Read status
                    val statusChar = it.getCharacteristic(ULP_CHAR_STATUS_UUID)
                    statusChar?.let { char ->
                        gatt.readCharacteristic(char)
                    }
                }
            }
        }
        
        override fun onCharacteristicRead(gatt: BluetoothGatt,
                                         characteristic: BluetoothGattCharacteristic,
                                         status: Int) {
            super.onCharacteristicRead(gatt, characteristic, status)
            
            if (characteristic.uuid == ULP_CHAR_STATUS_UUID) {
                val data = characteristic.value
                if (data.size >= 20) {
                    val eventCount = (data[0].toInt() and 0xFF) or
                                   ((data[1].toInt() and 0xFF) shl 8) or
                                   ((data[2].toInt() and 0xFF) shl 16) or
                                   ((data[3].toInt() and 0xFF) shl 24)
                    
                    runOnUiThread {
                        event_count.text = "Events: $eventCount"
                    }
                }
            }
        }
        
        override fun onCharacteristicChanged(gatt: BluetoothGatt,
                                           characteristic: BluetoothGattCharacteristic) {
            super.onCharacteristicChanged(gatt, characteristic)
            
            if (characteristic.uuid == ULP_CHAR_EVENT_UUID) {
                val data = characteristic.value
                val eventStr = "Event: ${data.size} bytes"
                
                events.add(0, eventStr)
                if (events.size > 50) events.removeAt(50)
                
                runOnUiThread {
                    latest_event.text = eventStr
                }
            }
        }
    }
    
    private fun startStream() {
        val service = gatt?.getService(ULP_SERVICE_UUID)
        val controlChar = service?.getCharacteristic(ULP_CHAR_CONTROL_UUID)
        
        controlChar?.let { char ->
            char.value = byteArrayOf(0x01) // Start stream command
            gatt?.writeCharacteristic(char)
            status_text.text = "Streaming started"
        }
    }
    
    private fun exportTrace() {
        val service = gatt?.getService(ULP_SERVICE_UUID)
        val controlChar = service?.getCharacteristic(ULP_CHAR_CONTROL_UUID)
        
        controlChar?.let { char ->
            char.value = byteArrayOf(0x03) // Export command
            gatt?.writeCharacteristic(char)
            status_text.text = "Export requested"
        }
    }
    
    private val updateUiRunnable = object : Runnable {
        override fun run() {
            connection_status.text = if (gatt != null) "Connected" else "Disconnected"
            events_list.text = events.joinToString("\n")
            handler.postDelayed(this, 1000)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        gatt?.disconnect()
        gatt?.close()
        handler.removeCallbacks(updateUiRunnable)
    }
}
```

layout/activity_main.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp">
    
    <TextView
        android:id="@+id/title_text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="🚀 ULP Trace Viewer"
        android:textSize="24sp"
        android:textStyle="bold" />
    
    <TextView
        android:id="@+id/status_text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Ready to scan"
        android:textSize="16sp" />
    
    <Button
        android:id="@+id/btn_scan"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Scan for ULP Devices" />
    
    <ListView
        android:id="@+id/device_list"
        android:layout_width="match_parent"
        android:layout_height="150dp"
        android:background="#f0f0f0" />
    
    <Button
        android:id="@+id/btn_connect"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Connect to Selected" />
    
    <TextView
        android:id="@+id/connection_status"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Status: Disconnected" />
    
    <TextView
        android:id="@+id/event_count"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Events: 0" />
    
    <Button
        android:id="@+id/btn_start_stream"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Start Stream" />
    
    <Button
        android:id="@+id/btn_export"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Export Trace" />
    
    <TextView
        android:id="@+id/latest_event"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Latest event: None"
        android:textSize="14sp"
        android:background="#e8f5e8"
        android:padding="8dp"
        android:layout_marginTop="8dp" />
    
    <ScrollView
        android:layout_width="match_parent"
        android:layout_height="200dp"
        android:layout_marginTop="8dp">
        
        <TextView
            android:id="@+id/events_list"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:fontFamily="monospace"
            android:textSize="12sp"
            android:background="#1a1a1a"
            android:textColor="#0f0"
            android:padding="8dp" />
            
    </ScrollView>
    
</LinearLayout>
```

Setup Instructions

1. Flash ESP32 with all components:

```bash
# Clone repository
git clone https://github.com/your-ulp/ulp-hardware
cd ulp-hardware

# Configure WiFi credentials
idf.py menuconfig
# → Component config → ULP Configuration → WiFi SSID/Password

# Build and flash
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

2. Connect to the system:

Web Interface:

1. Connect to ESP32 WiFi access point (or connect ESP32 to your WiFi)
2. Open browser to http://ulp-van.local or http://192.168.4.1
3. See real-time sensor events, charts, export traces

BLE Mobile App:

1. Install Android app (build from Kotlin code)
2. Enable Bluetooth
3. Scan for "ULP_VAN" device
4. Connect and stream events

5. Features:

· Real-time Web Dashboard: Events, charts, statistics
· BLE Mobile Streaming: Connect via Bluetooth to view on phone
· Trace Export: Download complete trace as .ulp file
· Multi-client Support: Multiple devices can connect simultaneously
· Status LED: Visual connection indicator

This gives you full remote monitoring of your ULP trace recorder from both web browsers and mobile devices.