#!/bin/sh
# projections/3d/canvas_2d.sh - Canvas 2D Projection
# Renders trace as 2D canvas visualization
set -eu
cat << 'CANVAS'
<!DOCTYPE html>
<html><head><title>ULP Canvas Trace</title></head>
<body style="margin:0;"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,c.width,c.height);
ctx.strokeStyle='#00d4ff';ctx.lineWidth=2;
ctx.font='16px monospace';ctx.fillStyle='#00ff88';
ctx.fillText('ULP Trace Visualization',20,40);
// Draw execution flow as timeline
let y=80;ctx.strokeStyle='#404040';
ctx.moveTo(50,y);ctx.lineTo(50,c.height-50);ctx.stroke();
</script></body></html>
CANVAS
