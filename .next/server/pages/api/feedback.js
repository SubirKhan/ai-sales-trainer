"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/api/feedback";
exports.ids = ["pages/api/feedback"];
exports.modules = {

/***/ "openai":
/*!*************************!*\
  !*** external "openai" ***!
  \*************************/
/***/ ((module) => {

module.exports = import("openai");;

/***/ }),

/***/ "(api)/./pages/api/feedback.ts":
/*!*******************************!*\
  !*** ./pages/api/feedback.ts ***!
  \*******************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! openai */ \"openai\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([openai__WEBPACK_IMPORTED_MODULE_0__]);\nopenai__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\nconst openai = new openai__WEBPACK_IMPORTED_MODULE_0__.OpenAI({\n    apiKey: process.env.OPENAI_API_KEY\n});\nasync function handler(req, res) {\n    if (req.method !== \"POST\") {\n        return res.status(405).json({\n            error: \"Method not allowed\"\n        });\n    }\n    const { messages } = req.body;\n    if (!messages || !Array.isArray(messages)) {\n        return res.status(400).json({\n            error: \"Invalid request format\"\n        });\n    }\n    try {\n        const completion = await openai.chat.completions.create({\n            model: \"gpt-4\",\n            messages,\n            temperature: 0.7\n        });\n        const reply = completion.choices[0]?.message?.content;\n        const jsonMatch = reply?.match(/\\{[\\s\\S]*\\}/);\n        if (!jsonMatch) {\n            return res.status(500).json({\n                error: \"Failed to parse structured feedback from AI response.\"\n            });\n        }\n        const feedback = JSON.parse(jsonMatch[0]);\n        return res.status(200).json(feedback);\n    } catch (error) {\n        console.error(\"OpenAI API Error:\", error);\n        return res.status(500).json({\n            error: error.message || \"Internal Server Error\"\n        });\n    }\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9wYWdlcy9hcGkvZmVlZGJhY2sudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFDZ0M7QUFFaEMsTUFBTUMsU0FBUyxJQUFJRCwwQ0FBTUEsQ0FBQztJQUN4QkUsUUFBUUMsUUFBUUMsR0FBRyxDQUFDQyxjQUFjO0FBQ3BDO0FBRWUsZUFBZUMsUUFBUUMsR0FBbUIsRUFBRUMsR0FBb0I7SUFDN0UsSUFBSUQsSUFBSUUsTUFBTSxLQUFLLFFBQVE7UUFDekIsT0FBT0QsSUFBSUUsTUFBTSxDQUFDLEtBQUtDLElBQUksQ0FBQztZQUFFQyxPQUFPO1FBQXFCO0lBQzVEO0lBRUEsTUFBTSxFQUFFQyxRQUFRLEVBQUUsR0FBR04sSUFBSU8sSUFBSTtJQUU3QixJQUFJLENBQUNELFlBQVksQ0FBQ0UsTUFBTUMsT0FBTyxDQUFDSCxXQUFXO1FBQ3pDLE9BQU9MLElBQUlFLE1BQU0sQ0FBQyxLQUFLQyxJQUFJLENBQUM7WUFBRUMsT0FBTztRQUF5QjtJQUNoRTtJQUVBLElBQUk7UUFDRixNQUFNSyxhQUFhLE1BQU1oQixPQUFPaUIsSUFBSSxDQUFDQyxXQUFXLENBQUNDLE1BQU0sQ0FBQztZQUN0REMsT0FBTztZQUNQUjtZQUNBUyxhQUFhO1FBQ2Y7UUFFQSxNQUFNQyxRQUFRTixXQUFXTyxPQUFPLENBQUMsRUFBRSxFQUFFQyxTQUFTQztRQUM5QyxNQUFNQyxZQUFZSixPQUFPSyxNQUFNO1FBQy9CLElBQUksQ0FBQ0QsV0FBVztZQUNkLE9BQU9uQixJQUFJRSxNQUFNLENBQUMsS0FBS0MsSUFBSSxDQUFDO2dCQUFFQyxPQUFPO1lBQXdEO1FBQy9GO1FBRUEsTUFBTWlCLFdBQVdDLEtBQUtDLEtBQUssQ0FBQ0osU0FBUyxDQUFDLEVBQUU7UUFDeEMsT0FBT25CLElBQUlFLE1BQU0sQ0FBQyxLQUFLQyxJQUFJLENBQUNrQjtJQUM5QixFQUFFLE9BQU9qQixPQUFPO1FBQ2RvQixRQUFRcEIsS0FBSyxDQUFDLHFCQUFxQkE7UUFDbkMsT0FBT0osSUFBSUUsTUFBTSxDQUFDLEtBQUtDLElBQUksQ0FBQztZQUFFQyxPQUFPQSxNQUFNYSxPQUFPLElBQUk7UUFBd0I7SUFDaEY7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL2FpLXNhbGVzLXRyYWluZXIvLi9wYWdlcy9hcGkvZmVlZGJhY2sudHM/YzdmMCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0QXBpUmVxdWVzdCwgTmV4dEFwaVJlc3BvbnNlIH0gZnJvbSAnbmV4dCc7XG5pbXBvcnQgeyBPcGVuQUkgfSBmcm9tICdvcGVuYWknO1xuXG5jb25zdCBvcGVuYWkgPSBuZXcgT3BlbkFJKHtcbiAgYXBpS2V5OiBwcm9jZXNzLmVudi5PUEVOQUlfQVBJX0tFWVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIocmVxOiBOZXh0QXBpUmVxdWVzdCwgcmVzOiBOZXh0QXBpUmVzcG9uc2UpIHtcbiAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykge1xuICAgIHJldHVybiByZXMuc3RhdHVzKDQwNSkuanNvbih7IGVycm9yOiAnTWV0aG9kIG5vdCBhbGxvd2VkJyB9KTtcbiAgfVxuXG4gIGNvbnN0IHsgbWVzc2FnZXMgfSA9IHJlcS5ib2R5O1xuXG4gIGlmICghbWVzc2FnZXMgfHwgIUFycmF5LmlzQXJyYXkobWVzc2FnZXMpKSB7XG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICdJbnZhbGlkIHJlcXVlc3QgZm9ybWF0JyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IG9wZW5haS5jaGF0LmNvbXBsZXRpb25zLmNyZWF0ZSh7XG4gICAgICBtb2RlbDogJ2dwdC00JyxcbiAgICAgIG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IDAuN1xuICAgIH0pO1xuXG4gICAgY29uc3QgcmVwbHkgPSBjb21wbGV0aW9uLmNob2ljZXNbMF0/Lm1lc3NhZ2U/LmNvbnRlbnQ7XG4gICAgY29uc3QganNvbk1hdGNoID0gcmVwbHk/Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0vKTtcbiAgICBpZiAoIWpzb25NYXRjaCkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdGYWlsZWQgdG8gcGFyc2Ugc3RydWN0dXJlZCBmZWVkYmFjayBmcm9tIEFJIHJlc3BvbnNlLicgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZmVlZGJhY2sgPSBKU09OLnBhcnNlKGpzb25NYXRjaFswXSk7XG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKGZlZWRiYWNrKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdPcGVuQUkgQVBJIEVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnSW50ZXJuYWwgU2VydmVyIEVycm9yJyB9KTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbIk9wZW5BSSIsIm9wZW5haSIsImFwaUtleSIsInByb2Nlc3MiLCJlbnYiLCJPUEVOQUlfQVBJX0tFWSIsImhhbmRsZXIiLCJyZXEiLCJyZXMiLCJtZXRob2QiLCJzdGF0dXMiLCJqc29uIiwiZXJyb3IiLCJtZXNzYWdlcyIsImJvZHkiLCJBcnJheSIsImlzQXJyYXkiLCJjb21wbGV0aW9uIiwiY2hhdCIsImNvbXBsZXRpb25zIiwiY3JlYXRlIiwibW9kZWwiLCJ0ZW1wZXJhdHVyZSIsInJlcGx5IiwiY2hvaWNlcyIsIm1lc3NhZ2UiLCJjb250ZW50IiwianNvbk1hdGNoIiwibWF0Y2giLCJmZWVkYmFjayIsIkpTT04iLCJwYXJzZSIsImNvbnNvbGUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(api)/./pages/api/feedback.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(api)/./pages/api/feedback.ts"));
module.exports = __webpack_exports__;

})();