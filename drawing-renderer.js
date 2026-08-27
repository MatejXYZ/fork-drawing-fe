export const CANVAS_SIZE = 1000;
export const BACKGROUND_COLOR = "#fff";

const getCoordinates = (point, scale) => [point.x * scale, point.y * scale];

export const clearCanvas = (ctx, backgroundColor = BACKGROUND_COLOR) => {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

export const getCanvasScale = (canvas) => {
  const width = canvas.getBoundingClientRect().width;
  return width > 0 ? CANVAS_SIZE / width : 1;
};

export const renderAction = (ctx, action) => {
  const points = action?.coordinates ?? [];
  if (points.length === 0) return;

  const color = action.color ?? "#000000";
  const size = action.size ?? 1;
  ctx.beginPath();

  if (points.length === 1) {
    ctx.fillStyle = color;
    ctx.arc(...getCoordinates(points[0], 1), size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.moveTo(...getCoordinates(points[0], 1));

  if (points.length === 2) {
    ctx.lineTo(...getCoordinates(points[0], 1));
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(
        ...getCoordinates(points[i], 1),
        ...getCoordinates({ x: midX, y: midY }, 1),
      );
    }
  }

  ctx.stroke();
};

export const renderActions = (
  canvas,
  actions = [],
  actionCount = actions.length,
) => {
  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  clearCanvas(ctx);

  actions.slice(0, actionCount).forEach((action) => renderAction(ctx, action));
};
