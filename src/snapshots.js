import SentenceChecklist from "./experiments/SentenceChecklist/SentenceChecklist";
import TextSplitter from "./experiments/TextSplitter/TextSplitter";
import TopographicButton from "./experiments/TopographicButton/TopographicButton";
import Dandelion from "./experiments/Dandelion/Dandelion";
import PixiKoiPond from "./experiments/PixiKoiPond/PixiKoiPond";
import PixelClouds from "./experiments/PixelClouds/PixelClouds";


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
        restart: true,
    },
        {
        id: "003",
        slug: "pixel-clouds",
        title: "Pixel-clouds",
        path: "/snapshots/pixel-clouds",
        description:
        "Yep",
        component: PixelClouds,
        restart: false,
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
        description: "An interactive koi pond",
        component: PixiKoiPond,    
        restart: false,    
    },
    
];
