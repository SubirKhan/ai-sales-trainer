"use strict";
(() => {
var exports = {};
exports.id = 240;
exports.ids = [240];
exports.modules = {

/***/ 79:
/***/ ((module) => {

module.exports = import("openai");;

/***/ }),

/***/ 605:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([openai__WEBPACK_IMPORTED_MODULE_0__]);
openai__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];

const openai = new openai__WEBPACK_IMPORTED_MODULE_0__.OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
            error: "Invalid request format"
        });
    }
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages,
            temperature: 0.7
        });
        const reply = completion.choices[0]?.message?.content;
        const jsonMatch = reply?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({
                error: "Failed to parse structured feedback from AI response."
            });
        }
        const feedback = JSON.parse(jsonMatch[0]);
        return res.status(200).json(feedback);
    } catch (error) {
        console.error("OpenAI API Error:", error);
        return res.status(500).json({
            error: error.message || "Internal Server Error"
        });
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(605));
module.exports = __webpack_exports__;

})();