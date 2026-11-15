import SentenceChecklist from "./studies/SentenceChecklist/SentenceChecklist";
import TextSplitter from "./studies/TextSplitter/TextSplitter";
import TopographicButton from "./studies/TopographicButton/TopographicButton";
import Dandelion from "./studies/Dandelion/Dandelion";
import PixiKoiPond from "./studies/PixiKoiPond/PixiKoiPond";
import PixelClouds from "./studies/PixelClouds/PixelClouds";


//STUDIES
export const studies = [
    {
        id: "001",
        title: "Sentence-checklist",
        path: "/studies/001",
        description:
        "Write your tasks as a continuous sentence whilst separating each task with a full stop. Press enter to turn it into checklist items.\n\nThe sentence is parsed by finding the full stops and splitting the text into individual checklist.\n\nAs tasks are ticked off, their respective words in the original sentence turn darker, completeing the interaction.",
        component: SentenceChecklist,
        restart: true,
    },
    {
        id: "002",
        title: "Text-splitter",
        path: "/studies/002",
        description:
        "Challenge: by reszing the text boxes can you form more than 13 text boxes?\n\nI've always found graphic design tools unnecessarily annoying when it comes to splitting text boxes as you often have to create copies and delete parts of them separately.\n\nThe splitting tool uses JavaScript DOM measurements to detect individual lines of text and determine split points. Pointer events handle dragging, resizing, and splitting boxes around the playground canvas.",
        component: TextSplitter,
        layout: "fullscreen",
        restart: true,
    },
        {
        id: "003",
        title: "pixel-clouds",
        path: "/studies/003",
        description:
        "Yep",
        component: PixelClouds,
        restart: false,
    },
    {
        id: "004",
        title: "Topographic-button",
        path: "/studies/004",
        description:
        "The button uses a canvas to draw animated topographic contour lines that slowly shift on their own, while tracking the cursor to create a smooth red trail that follows your movement.\n\n530 lines of javascript code and 130 lines of css for one button... Seriously?\n\n Not ideal by any stretch but it is an example of a unique aesthetic to an otherwise boring hover animation.",
        component: TopographicButton,
        restart: false,
    },
    {
        id: "005",
        title: "Dandelion",
        path: "/studies/005",
        description:
        "An interactive botanical study exploring wind, motion and impermanence.",
        component: Dandelion,
        layout: "fullscreen",
        restart: false,
        
    },
        {
        id: "006",
        title: "Pixi-Koi-Pond",
        path: "/studies/006",
        description:
        "An interactive koi pond",
        component: PixiKoiPond,    
        restart: false,    
    },
    
];
