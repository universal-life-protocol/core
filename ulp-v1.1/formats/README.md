# ULP File Format Handlers

These handlers process various file formats within ULP traces.

## Supported Formats

- **SVG**: Scalable Vector Graphics
- **MTL/OBJ**: 3D model materials and objects
- **MP4**: Video encoding (trace → video)
- **WAV**: Audio encoding (trace → audio)
- **GLB**: GL Transmission Format binary

All handlers are pure functions that transform trace data to/from these formats.
