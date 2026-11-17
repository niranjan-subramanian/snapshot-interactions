import SentenceChecklist from "./experiments/SentenceChecklist/SentenceChecklist";
import TextSplitter from "./experiments/TextSplitter/TextSplitter";
import TopographicButton from "./experiments/TopographicButton/TopographicButton";
import Dandelion from "./experiments/Dandelion/Dandelion";
import PixiKoiPond from "./experiments/PixiKoiPond/PixiKoiPond";
import PixelClouds from "./experiments/PixelClouds/PixelClouds";
import SpatialArchive from "./experiments/SpatialArchive/SpatialArchive";


//STUDIES
export const snapshots = [
    {
        id: "001",
        slug: "sentence-checklist",
        title: "Sentence-checklist",
        path: "/snapshots/sentence-checklist",
        description:
        "Write your tasks as a continuous sentence whilst separating each task with a full stop. Press enter to turn it into checklist items.\n\nThe sentence is parsed by finding the full stops and splitting the text into individual checklist.\n\nAs tasks are ticked off, their respective words in the original sentence turn darker, completeing the interaction.",
        component: SentenceChecklist,
        restart: true,
    },
    {
        id: "002",
        slug: "text-splitter",
        title: "Text-splitter",
        path: "/snapshots/text-splitter",
        description:
        "Challenge: by reszing the text boxes can you form more than 13 text boxes?\n\nI've always found graphic design tools unnecessarily annoying when it comes to splitting text boxes as you often have to create copies and delete parts of them separately.\n\nThe splitting tool uses JavaScript DOM measurements to detect individual lines of text and determine split points. Pointer events handle dragging, resizing, and splitting boxes around the playground canvas.",
        component: TextSplitter,
        layout: "fullscreen",
    },
        {
        id: "003",
        slug: "pixel-clouds",
        title: "Pixel-clouds",
        path: "/snapshots/pixel-clouds",
        description:
        "A little experiment in recreating a moving sky using pixel art. The clouds slowly drift across the screen, with the entire scene rendered as a grid of oversized pixels.\n\nThe sky is drawn using layered radial gradients on an HTML canvas (pretty old school), while transparent cloud images are animated over the top.\n\nTurns out a couple of clouds and some gradients can make a pretty convincing sky.",
        component: PixelClouds,
        restart: false,
        layout: "fullscreen",
    },
    {
        id: "004",
        slug: "topographic-button",
        title: "Topographic-button",
        path: "/snapshots/topographic-button",
        description: "The button uses a canvas to draw animated topographic contour lines that slowly shift on their own, while tracking the cursor to create a smooth red trail that follows your movement.\n\n530 lines of javascript code and 130 lines of css for one button... Seriously?\n\n Not ideal by any stretch but it is an example of a unique aesthetic to an otherwise boring hover animation.",
        component: TopographicButton,
        restart: false,
    },
    {
        id: "005",
        slug: "dandelion",
        title: "Dandelion",
        path: "/snapshots/dandelion",
        description:"An interactive botanical study exploring wind, motion and impermanence.",
        component: Dandelion,
        layout: "fullscreen",
        restart: false,
        
    },
    {
        id: "006",
        slug: "pixi-koi-pond",
        title: "Pixi-Koi-Pond",
        path: "/snapshots/pixi-koi-pond",
        description: "A small interactive koi pond inspired by Nagomi where the fish swim around on their own, but seem to not like the cursor very much.\n\nBuilt using PixiJS, with each .png fish rendered as a deformable mesh that bends and moves as it swims. The entire scene is rendered at a lower resolution to create the pixelated effect, which can be toggled off to see the original artwork.\n\nThe hardest part was getting the fish's bending movements to swim accurately rather than static images sliding around the screen.",
        component: PixiKoiPond,    
        restart: false,    
        layout: "fullscreen",
    },
    {
    id: "007",
    slug: "spatial-archive",
    title: "Spatial-archive",
    path: "/snapshots/spatial-archive",
    description:
        "An interactive collection of images arranged across an explorable canvas. Drag to move around, zoom to explore, and select individual images to bring them into focus.",
    component: SpatialArchive,
    restart: false,
    layout: "fullscreen",
    },
    
];
