# Conversation Series - Published Multimedia Experience

This directory contains the **published version** of the Conversation Series multimedia experience, optimized for GitHub Pages deployment.

## 🌐 Live Website

Once deployed, this will be accessible at:
```
https://universal-life-protocol.github.io/core/
```

## 📁 Structure

```
docs/
├── index.html                  # Landing page
├── viewer.html                 # Desktop 3D viewer
├── ar-experience.html          # Complete AR/VR experience
├── projections/
│   ├── svg/                    # 2D illustrations (8 files)
│   ├── gltf/                   # AR/VR scenes (8 files)
│   └── ar/                     # Individual AR experiences (8 files)
└── .nojekyll                   # GitHub Pages config
```

## 🚀 Features

- **Landing Page**: Beautiful entry point with article navigation
- **3D Viewer**: Interactive desktop viewer with full controls
- **AR Experience**: Mobile augmented reality viewer
- **Direct Links**: Access individual articles in any format

## 🎯 Usage

### Local Testing
```bash
# Serve locally
python3 -m http.server 8000 --directory docs

# Open in browser
firefox http://localhost:8000
```

### GitHub Pages Deployment

1. **Enable GitHub Pages**:
   - Go to repository Settings
   - Navigate to Pages
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/docs`
   - Save

2. **Wait for deployment** (1-2 minutes)

3. **Access**: `https://<username>.github.io/<repo>/`

## 📊 What's Published

- ✅ **8 Articles** in 3 formats each (24 files)
- ✅ **2 Interactive Viewers** (HTML/JS)
- ✅ **1 Landing Page** with navigation
- ✅ **Total**: 146 KB of content

## 🎨 Formats Available

Each of the 8 articles is available in:
- **SVG**: 2D vector illustration
- **glTF**: 3D AR/VR scene
- **HTML**: Individual AR experience

## 🔗 Quick Links

From the landing page, users can:
- Launch the full 3D viewer
- Start the AR experience
- View individual articles in any format
- Access source code on GitHub

## 💡 Notes

- All files are static HTML/JS/SVG
- No server-side processing required
- Works on any modern browser
- Mobile AR requires camera permissions
- OBJ files excluded (use source repo for 3D models)

## 📚 Documentation

For complete documentation, see:
- [CONVERSATION_SERIES_GUIDE.md](../CONVERSATION_SERIES_GUIDE.md)
- [MULTIMEDIA_STORY_SYSTEM.md](../MULTIMEDIA_STORY_SYSTEM.md)
- [README.md](../README.md)

---

**Published from**: Universal Life Protocol v1.1
**Generated**: 2025-12-31
**One story. Eight articles. Infinite perspectives.**
