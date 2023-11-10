import "./style.css";
import rockIcon from "./rock_icon.png";
import scissorsIcon from "./scissors_icon.png";
import paperIcon from "./paper_icon.png";
import * as R from "remeda";
import {keys} from "remeda";

type Vector2D = {
  x: number;
  y: number;
};

enum ShapeType { Rock, Paper, Scissors }

type Shape = {
  shapeType: ShapeType;
  position: Vector2D;
  velocity: Vector2D;
};

function generateShapes(): Shape[] {
  const count = 40;
  return R.pipe(
    R.range(0, count),
    R.map(() => ({
      shapeType: Math.floor(Math.random() * 3),
      position: {
        x: Math.floor(Math.random() * (window.innerWidth - 48)),
        y: Math.floor(Math.random() * (window.innerHeight - 48)),
      },
      velocity: {
        x: 0.5 + Math.floor(Math.random() * 1.5),
        y: 0.5 + Math.floor(Math.random() * 1.5),
      },
    }))
  );
}

function draw(timestamp: DOMHighResTimeStamp): void {
  const delta = (timestamp - lastTimestamp) / (1000 / 60);
  lastTimestamp = timestamp;

  const counts = computeShapeTypeCounts(shapes);
  const gameOver = R.pipe(
    Object.values(counts),
    R.filter(v => v !== 0),
    R.length()
  ) <= 1;
  const winningShape = ShapeType[R.maxBy(Object.entries(counts), ([, v]) => v)[0]];

  ctx.save();
  if (gameOver) {
    ctx.filter = "blur(6px)";
  }
  drawBackground();
  drawShapes(shapes);
  drawScores(counts);
  ctx.restore();
  if (gameOver) {
    drawGameOver(winningShape);
  }
  shapes = updateShapes(delta, shapes);

  window.requestAnimationFrame(draw);
}

function computeShapeTypeCounts(shapes: Shape[]): Record<ShapeType, number> {
  let counts: Record<ShapeType, number> = R.pipe(
    shapes,
    R.groupBy(shape => shape.shapeType),
    R.mapValues(value => value.length),
  );
  counts = R.merge({[ShapeType.Rock]:0,[ShapeType.Scissors]:0,[ShapeType.Paper]:0}, counts); // might be able to improve this

  return counts;
}

function drawGameOver(winningShape: ShapeType): void {
  ctx.save();

  ctx.font = "48px serif";
  ctx.fillStyle = "white";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 15;
  ctx.textAlign = "center";
  ctx.fillText(`${winningShape} wins!`, width / 2, height / 2);

  ctx.restore();
}

function drawBackground(): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "rgb(79 79 79)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawShapes(shapes: Shape[]): void {
  shapes.forEach(shape => {
    ctx.drawImage(mapShapeTypeToImage(shape.shapeType), shape.position.x, shape.position.y);
  });
}

function updateShapes(delta: number, shapes: Shape[]): Shape[] {
  const updatePosition = (position: Vector2D, velocity: Vector2D): Vector2D => ({
    x: position.x + velocity.x * delta * 5,
    y: position.y + velocity.y * delta * 5,
  });

  shapes = R.pipe(
    shapes,
    R.map(shape => {
      let updatedShape = R.clone(shape);

      // Update position based on velocity
      updatedShape.position = updatePosition(shape.position, shape.velocity);

      // Bounce shape off canvas edge
      if (updatedShape.position.x < 0 || updatedShape.position.x >= width - shapeSize.x) {
        updatedShape.velocity.x *= -1;
        updatedShape.position = updatePosition(shape.position, shape.velocity);
      }
      if (updatedShape.position.y < 0 || updatedShape.position.y >= height - shapeSize.y) {
        updatedShape.velocity.y *= -1;
        updatedShape.position = updatePosition(shape.position, shape.velocity);
      }

      return updatedShape;
    }),
    R.map(shape => {
      let updatedShape = R.clone(shape);

      // Check for collisions with other (losing) shapes and update shape type accordingly
      const collidingShape = R.find(shapes, shape2 =>
        isLosingShapeType(shape.shapeType, shape2.shapeType) && checkForCollision(shape, shape2));

      if (collidingShape !== undefined) {
        updatedShape.shapeType = collidingShape.shapeType;
      }

      return updatedShape;
    })
  );

  return shapes;
}

function isLosingShapeType(shapeType1: ShapeType, shapeType2: ShapeType): boolean {
  if (shapeType1 === shapeType2) {
    return false;
  }

  const losesOver: Record<ShapeType, ShapeType> = {
    [ShapeType.Paper]: ShapeType.Scissors,
    [ShapeType.Rock]: ShapeType.Paper,
    [ShapeType.Scissors]: ShapeType.Rock,
  };

  return losesOver[shapeType1] === shapeType2;
}

function checkForCollision(shape1: Shape, shape2: Shape): boolean {
  // Not sure if there's a better way
  return (
    shape2.position.x > shape1.position.x
      && shape2.position.x < shape1.position.x + shapeSize.x
      && shape2.position.y > shape1.position.y
      && shape2.position.y < shape1.position.y + shapeSize.y
  ) || (
    shape1.position.x > shape2.position.x
      && shape1.position.x < shape2.position.x + shapeSize.x
      && shape1.position.y > shape2.position.y
      && shape1.position.y < shape2.position.y + shapeSize.y
  );
}

function mapShapeTypeToImage(shapeType: ShapeType): CanvasImageSource {
  switch (shapeType) {
    case ShapeType.Paper:
      return paperImage;
    case ShapeType.Rock:
      return rockImage;
    case ShapeType.Scissors:
      return scissorsImage;
  }
}

function drawScores(counts: Record<ShapeType, number>) {
  const countsText: string = R.pipe(
    Object.entries(counts),
    R.map(([key, value]) => `${ShapeType[key]}: ${value}`),
    R.join("; ")
  );

  ctx.font = "16px serif";
  ctx.fillStyle = "white";
  ctx.fillText(countsText, 10, 26);
  // ctx.fillText("Test lol", 10, 52);
}

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
const width = (canvas.width = window.innerWidth);
const height = (canvas.height = window.innerHeight);
const shapeSize: Vector2D = {x: 48, y: 48};

const ctx = canvas.getContext("2d");

const rockImage = new Image();
rockImage.src = rockIcon;
const scissorsImage = new Image();
scissorsImage.src = scissorsIcon;
const paperImage = new Image();
paperImage.src = paperIcon;

let lastTimestamp: DOMHighResTimeStamp = 0;

let shapes = generateShapes();
draw(lastTimestamp);

//todo handle resizing
