
const GAP = 16;
const UNIT = 132;
const STEP = UNIT + GAP;

const IMAGE_COUNT = 21;
const INITIAL_COUNT = 14;

// TUNE
const CONTACT_WEIGHT = 2.0;
const CENTRE_WEIGHT = 1.5;
const BALANCE_WEIGHT = 5.0;
const ASPECT_WEIGHT = 2.0;
const STRAIGHT_EDGE_WEIGHT = 2.5;

// higher = more random
const TEMPERATURE = 2;

// [column, row, width in cells, height in cells]
const STARTING_LAYOUT = [
  // upper section
  [-2, -2, 2, 2],
  [0, -2, 1, 1],
  [1, -2, 2, 2],

  // mid section
  [-3, 0, 1, 1],
  [-2, 0, 1, 1],
  [-1, 0, 2, 2],
  [1, 0, 1, 1],
  [2, 0, 2, 2],

  // lower section
  [-3, 1, 1, 2],
  [-2, 2, 2, 1],
  [0, 2, 2, 2],

  // gap fillers
  [0, -1, 1, 1],
  [-2, 1, 1, 1],
  [1, 1, 1, 1],
];

const INITIAL_BLANKS = new Set([1, 4, 7, 12]);

const SIZES = [
  { columns: 1, rows: 1, weight: 35 },
  { columns: 2, rows: 2, weight: 25 },
  { columns: 2, rows: 1, weight: 20 },
  { columns: 1, rows: 2, weight: 20 },
];

const ANCHOR = { x: 0, y: 0 };

function createRandom() {
  return Math.random;
}

function createTile(id, image, position, revealAt = 0) {
  const [column, row, columns, rows] = position;

  return {
    id,
    image,
    kind: image ? "image" : "blank",
    revealAt,
    column,
    row,
    columns,
    rows,
    x: column * STEP,
    y: row * STEP,
    width: columns * UNIT + (columns - 1) * GAP,
    height: rows * UNIT + (rows - 1) * GAP,
  };
}

function cellKey(x, y) {
  return `${x},${y}`;
}

function isFree(occupied, column, row, columns, rows) {
  for (let y = row; y < row + rows; y++) {
    for (let x = column; x < column + columns; x++) {
      if (occupied.has(cellKey(x, y))) {
        return false;
      }
    }
  }

  return true;
}

function occupy(occupied, tile) {
  for (let y = tile.row; y < tile.row + tile.rows; y++) {
    for (let x = tile.column; x < tile.column + tile.columns; x++) {
      occupied.add(cellKey(x, y));
    }
  }
}

function getGridBounds(tiles) {
  return {
    minX: Math.min(...tiles.map(tile => tile.column)),
    minY: Math.min(...tiles.map(tile => tile.row)),
    maxX: Math.max(
      ...tiles.map(tile => tile.column + tile.columns)
    ),
    maxY: Math.max(
      ...tiles.map(tile => tile.row + tile.rows)
    ),
  };
}

export function getArchiveBounds(tiles) {
  if (!tiles.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  const minX = Math.min(...tiles.map(tile => tile.x));
  const minY = Math.min(...tiles.map(tile => tile.y));
  const maxX = Math.max(
    ...tiles.map(tile => tile.x + tile.width)
  );
  const maxY = Math.max(
    ...tiles.map(tile => tile.y + tile.height)
  );

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function countContacts(
  occupied,
  column,
  row,
  columns,
  rows
) {
  let contacts = 0;

  for (let x = column; x < column + columns; x++) {
    if (occupied.has(cellKey(x, row - 1))) {
      contacts++;
    }

    if (occupied.has(cellKey(x, row + rows))) {
      contacts++;
    }
  }

  for (let y = row; y < row + rows; y++) {
    if (occupied.has(cellKey(column - 1, y))) {
      contacts++;
    }

    if (occupied.has(cellKey(column + columns, y))) {
      contacts++;
    }
  }

  return contacts;
}

function straightEdgePenalty(occupied, bounds) {
  let penalty = 0;

  const outerLines = [
    Array.from(
      { length: bounds.maxX - bounds.minX },
      (_, index) =>
        occupied.has(
          cellKey(bounds.minX + index, bounds.minY)
        )
    ),

    Array.from(
      { length: bounds.maxX - bounds.minX },
      (_, index) =>
        occupied.has(
          cellKey(bounds.minX + index, bounds.maxY - 1)
        )
    ),

    Array.from(
      { length: bounds.maxY - bounds.minY },
      (_, index) =>
        occupied.has(
          cellKey(bounds.minX, bounds.minY + index)
        )
    ),

    Array.from(
      { length: bounds.maxY - bounds.minY },
      (_, index) =>
        occupied.has(
          cellKey(bounds.maxX - 1, bounds.minY + index)
        )
    ),
  ];

  for (const line of outerLines) {
    let run = 0;

    for (const filled of line) {
      run = filled ? run + 1 : 0;

      if (run > 3) {
        penalty += run - 3;
      }
    }
  }

  return penalty;
}

function scoreCandidate(tiles, occupied, position) {
  const [column, row, columns, rows] = position;

  const currentBounds = getGridBounds(tiles);

  const nextBounds = {
    minX: Math.min(currentBounds.minX, column),
    minY: Math.min(currentBounds.minY, row),
    maxX: Math.max(
      currentBounds.maxX,
      column + columns
    ),
    maxY: Math.max(
      currentBounds.maxY,
      row + rows
    ),
  };

  const width = nextBounds.maxX - nextBounds.minX;
  const height = nextBounds.maxY - nextBounds.minY;

  // Keep the overall bounding box centred.
  const boundsCentreX =
    (nextBounds.minX + nextBounds.maxX) / 2;

  const boundsCentreY =
    (nextBounds.minY + nextBounds.maxY) / 2;

  const balancePenalty = Math.hypot(
    boundsCentreX,
    boundsCentreY
  );

  // Discourage excessively wide or tall compositions.
  const aspectPenalty = Math.abs(width - height);

  // Prefer tiles reasonably close to the archive centre.
  const tileCentreX = column + columns / 2;
  const tileCentreY = row + rows / 2;

  const distance = Math.hypot(
    tileCentreX,
    tileCentreY
  );

  const contacts = countContacts(
    occupied,
    column,
    row,
    columns,
    rows
  );

  const testOccupied = new Set(occupied);

  for (let y = row; y < row + rows; y++) {
    for (let x = column; x < column + columns; x++) {
      testOccupied.add(cellKey(x, y));
    }
  }

  const edgePenalty = straightEdgePenalty(
    testOccupied,
    nextBounds
  );

  const idealContacts = Math.max(
    1,
    Math.min(columns, rows)
  );

  const contactPenalty = Math.abs(
    contacts - idealContacts
  );

  return (
    -balancePenalty * BALANCE_WEIGHT
    -aspectPenalty * ASPECT_WEIGHT
    -distance * CENTRE_WEIGHT
    -edgePenalty * STRAIGHT_EDGE_WEIGHT
    -contactPenalty * CONTACT_WEIGHT
  );
}

function findNextPosition(tiles, occupied, random) {
  const bounds = getGridBounds(tiles);
  const candidates = [];

  for (const size of SIZES) {
    for (
      let row = bounds.minY - size.rows;
      row <= bounds.maxY;
      row++
    ) {
      for (
        let column = bounds.minX - size.columns;
        column <= bounds.maxX;
        column++
      ) {
        if (
          !isFree(
            occupied,
            column,
            row,
            size.columns,
            size.rows
          )
        ) {
          continue;
        }

        const contacts = countContacts(
          occupied,
          column,
          row,
          size.columns,
          size.rows
        );

        if (contacts === 0) {
          continue;
        }

        const position = [
          column,
          row,
          size.columns,
          size.rows,
        ];

        candidates.push({
          position,
          score: scoreCandidate(
            tiles,
            occupied,
            position
          ),
          sizeWeight: size.weight,
        });
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      "No valid archive expansion position found."
    );
  }

  const bestScore = Math.max(
    ...candidates.map(candidate => candidate.score)
  );

  const weighted = candidates.map(candidate => ({
    ...candidate,
    weight:
      Math.exp(
        (candidate.score - bestScore) / TEMPERATURE
      ) * candidate.sizeWeight,
  }));

  const totalWeight = weighted.reduce(
    (sum, candidate) => sum + candidate.weight,
    0
  );

  let selection = random() * totalWeight;

  for (const candidate of weighted) {
    selection -= candidate.weight;

    if (selection <= 0) {
      return candidate.position;
    }
  }

  return weighted[weighted.length - 1].position;
}

export function createArchiveLayout() {
  const random = createRandom();
  const occupied = new Set();
  const tiles = [];

  STARTING_LAYOUT.forEach((position, index) => {
    const image = INITIAL_BLANKS.has(index)
      ? null
      : `/images/archive/${String(index + 1).padStart(2, "0")}.webp`;

    const tile = createTile(
      `tile-${index + 1}`,
      image,
      position
    );

    if (
      !isFree(
        occupied,
        tile.column,
        tile.row,
        tile.columns,
        tile.rows
      )
    ) {
      throw new Error(
        `Starting tiles overlap: ${tile.id}`
      );
    }

    occupy(occupied, tile);
    tiles.push(tile);
  });

  const initialBounds = getArchiveBounds(tiles);
  const remainingImages = [];

  for (let index = 0; index < IMAGE_COUNT; index++) {
    if (
      index < INITIAL_COUNT &&
      !INITIAL_BLANKS.has(index)
    ) {
      continue;
    }

    remainingImages.push(
      `/images/archive/${String(index + 1).padStart(2, "0")}.webp`
    );
  }

  let addition = 0;

  for (const image of remainingImages) {
    for (const content of [image, null]) {
      const position = findNextPosition(
        tiles,
        occupied,
        random
      );

      addition++;

      const tile = createTile(
        `added-${addition}`,
        content,
        position,
        addition
      );

      occupy(occupied, tile);
      tiles.push(tile);
    }
  }

  const bounds = getArchiveBounds(tiles);

  return {
    tiles,
    ...bounds,
    anchor: ANCHOR,
    initialBounds,
    initialCount: INITIAL_COUNT,
    additions: addition,
    imageCount: IMAGE_COUNT,
  };
}
