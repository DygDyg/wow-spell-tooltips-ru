"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
var spellData = [];
function spellDataToMessage(spellInfo) {
    var message = [];
    message.push("**" + spellInfo.name + "** *(id: " + spellInfo.id + ")*");
    if (spellInfo.maxRange > 0) {
        if (spellInfo.maxRange > 1000) {
            message[0] += " - Unlimited range";
        }
        else {
            message[0] += " - " + ((spellInfo.minRange > 0) ? spellInfo.minRange + "-" : "") + spellInfo.maxRange + " yd range";
        }
    }
    if (spellInfo.castTime > 0) {
        message.push("*" + spellInfo.castTime / 1000 + " sec cast*");
    }
    message.push(spellInfo.desc.replace(/(?:\\r)?\\n/g, "\n\n"));
    return message;
}
function getSpellIdDecorationType() {
    let options = {};
    let config = vscode.workspace.getConfiguration('wowSpellTooltips');
    if (config.get('style.backgroundColor')) {
        options["backgroundColor"] = { id: 'wowSpellTooltips.spellIdBackground' };
    }
    if (config.get('style.underline')) {
        options["textDecoration"] = "underline";
    }
    return vscode.window.createTextEditorDecorationType(options);
}
function activate(context) {
    fs.createReadStream(path.resolve(__dirname, 'assets', 'SpellData.csv'))
        .pipe(csv({
        headers: ["id", "name", "rank", "icon", "castTime", "minRange", "maxRange", "desc"],
    }))
        .on('data', (data) => spellData[data["id"]] = data)
        .on('end', triggerUpdateDecorations);
    let timeout = undefined;
    let spellIdDecorationType = getSpellIdDecorationType();
    let activeEditor = vscode.window.activeTextEditor;
    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        spellIdDecorationType.dispose();
        spellIdDecorationType = getSpellIdDecorationType();
        let config = vscode.workspace.getConfiguration('wowSpellTooltips');
        const regEx = /\d+/g;
        const text = activeEditor.document.getText();
        const spellIds = [];
        let match;
        while (match = regEx.exec(text)) {
            const startPos = activeEditor.document.positionAt(match.index);
            const endPos = activeEditor.document.positionAt(match.index + match[0].length);
            let spellId = match[0];
            if (spellId >= config.get('minNumber') && spellId <= config.get('maxNumber') && spellId in spellData) {
                var spellInfo = spellData[match[0]];
                const message = spellDataToMessage(spellInfo);
                const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: message };
                spellIds.push(decoration);
            }
        }
        activeEditor.setDecorations(spellIdDecorationType, spellIds);
    }
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 100);
    }
    if (activeEditor) {
        triggerUpdateDecorations();
    }
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map