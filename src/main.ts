import "./style.css";
import * as R from "remeda";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import paperIcon from "./paper_icon.png";
import rockIcon from "./rock_icon.png";
import scissorsIcon from "./scissors_icon.png";
import "@fontsource/inter/700.css";

type Vector2D = {
    x: number;
    y: number;
};

type ShapeType = "rock" | "paper" | "scissors";

type Shape = {
    shapeType: ShapeType;
    position: Vector2D;
    velocity: Vector2D;
};

function generateShapes(): Shape[] {
    const count = computeShapeCount();
    return R.pipe(
        R.range(0, count),
        R.map(() => ({
            shapeType: mapIndexToShapeType(Math.floor(Math.random() * 3)),
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

function computeShapeCount(): number {
    // TODO: Allow user to change density
    const density = 20000;
    return Math.floor((width * height) / density);
}

//todo maybe improve this later
function mapIndexToShapeType(index: number): ShapeType {
    switch (index) {
        default:
            return "rock";
        case 1:
            return "paper";
        case 2:
            return "scissors";
    }
}

//todo maybe improve this later
function convertToTitleCase(string: string): string {
    return string[0].toUpperCase() + string.slice(1);
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
    const winningShapeType = getWinningShapeType(counts);

    ctx.save();
    if (gameOver) {
        ctx.filter = "blur(6px)";
    }
    drawBackground();
    drawShapes(shapes, timestamp);
    drawScores(counts);
    drawControlsText();
    ctx.restore();
    if (gameOver) {
        drawGameOver(winningShapeType);
    }

    if (timestamp - gameStartedTimestamp >= 1300) {
        shapes = updateShapes(delta, shapes);
    }

    window.requestAnimationFrame(draw);
}

function getWinningShapeType(counts: Record<ShapeType, number>): ShapeType | null {
    const winningCountEntry = R.firstBy(Object.entries(counts) as [ShapeType, number][], [([, v]) => v, "desc"]);
    if (winningCountEntry === undefined) {
        return null;
    }

    return winningCountEntry[0];
}

function computeShapeTypeCounts(shapes: Shape[]): Record<ShapeType, number> {
    const counts: Partial<Record<ShapeType, number>> = R.pipe(
        shapes,
        R.groupBy(shape => shape.shapeType),
        R.mapValues(value => value.length),
    ); // might be able to improve this
    return R.merge({rock: 0, scissors: 0, paper: 0}, counts) as Record<ShapeType, number>;
}

function drawGameOver(winningShapeType: ShapeType | null): void {
    ctx.save();

    ctx.font = "48px Inter, sans-serif";
    ctx.fillStyle = "white";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 15;
    ctx.textAlign = "center";
    ctx.fillText(`${(winningShapeType != null ? convertToTitleCase(winningShapeType) : "No one")} wins!`, width / 2, height / 2);

    ctx.font = "18px Inter, sans-serif";
    ctx.fillText("Press space key to reset", width / 2, (height / 2) + 30);

    ctx.restore();
}

function drawBackground(): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "rgb(79 79 79)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawShapes(shapes: Shape[], timestamp: DOMHighResTimeStamp): void {
    shapes.forEach((shape, index) => {
        const endTime = 900;
        const shapeAppearTime = (index * endTime) / shapes.length;
        if (timestamp - gameStartedTimestamp >= shapeAppearTime) {
            ctx.drawImage(mapShapeTypeToImage(shape.shapeType), shape.position.x, shape.position.y);
        }
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
            // Using `Math.abs()` to avoid shapes getting "trapped" at edge of window
            if (updatedShape.position.x < 0) {
                updatedShape.velocity.x = Math.abs(updatedShape.velocity.x);
                updatedShape.position = updatePosition(shape.position, shape.velocity);
            } else if (updatedShape.position.x >= width - shapeSize.x) {
                updatedShape.velocity.x = -Math.abs(updatedShape.velocity.x);
                updatedShape.position = updatePosition(shape.position, shape.velocity);
            }
            if (updatedShape.position.y < 0) {
                updatedShape.velocity.y = Math.abs(updatedShape.velocity.y);
                updatedShape.position = updatePosition(shape.position, shape.velocity);
            }
            if (updatedShape.position.y >= height - shapeSize.y) {
                updatedShape.velocity.y = -Math.abs(updatedShape.velocity.y);
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
        ["paper"]: "scissors",
        ["rock"]: "paper",
        ["scissors"]: "rock",
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
        case "paper":
            return paperImage;
        case "rock":
            return rockImage;
        case "scissors":
            return scissorsImage;
    }
}

function drawScores(counts: Record<ShapeType, number>) {
    const countsText: string = R.pipe(
        Object.entries(counts),
        R.map(([key, value]) => `${convertToTitleCase(key)}: ${value}`),
        R.join("; ")
    );

    ctx.font = "16px Inter, sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText(countsText, 10, 26);
}

function drawControlsText() {
    ctx.save();

    ctx.font = "16px Inter, sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "right";
    ctx.fillText("Press space to reset", width - 10, 26);

    ctx.restore();
}

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);
const shapeSize: Vector2D = {x: 48, y: 48};

const ctx = canvas.getContext("2d")!;

const rockImage = new Image();
rockImage.src = rockIcon;
const scissorsImage = new Image();
scissorsImage.src = scissorsIcon;
const paperImage = new Image();
paperImage.src = paperIcon;

let lastTimestamp: DOMHighResTimeStamp = 0;
let gameStartedTimestamp: DOMHighResTimeStamp = 0;

let shapes = generateShapes();
draw(lastTimestamp);

// Handle resizing
const canvasSizeResizeDebouncer = R.debounce(() => {
    width = (canvas.width = window.innerWidth);
    height = (canvas.height = window.innerHeight);
}, { timing: "both", waitMs: 50 });

const regenerateShapesResizeDebouncer = R.debounce(() => {
    // Easier just to reset shapes since the number of shapes is based on window size and would be awkward to adjust
    // Also it means we don't have to worry about shapes being outside the canvas
    shapes = generateShapes();
}, { timing: "trailing", waitMs: 500 });

const resize = (): void => {
    canvasSizeResizeDebouncer.call();
    regenerateShapesResizeDebouncer.call();
};

window.addEventListener("resize", resize);

const keydownHandler = (event: KeyboardEvent) => {
    if (event.key === " " && !event.repeat) {
        shapes = generateShapes();
        gameStartedTimestamp = event.timeStamp;
    }
};

window.addEventListener("keydown", keydownHandler);
