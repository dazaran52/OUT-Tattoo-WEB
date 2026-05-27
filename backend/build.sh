#!/bin/bash
# Build script for Render with cache busting

echo "Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

echo "Build complete!"
