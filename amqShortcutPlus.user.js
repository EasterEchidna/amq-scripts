// ==UserScript==
// @name         AMQ Shortcut+
// @namespace    https://github.com/EasterEchidna
// @version      1.2.3
// @description  Allows you to type shortcuts for anime titles in the answer box.
// @author       EasterEchidna
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqWindows.js
// @downloadURL  https://github.com/easterechidna/amq-scripts/raw/main/amqShortcutPlus.user.js
// @updateURL    https://github.com/easterechidna/amq-scripts/raw/main/amqShortcutPlus.user.js
// ==/UserScript==


if (document.getElementById('startPage')) {
    return;
}

// Default data
const defaultData = {
    enabled: true,
    activeProfile: 'Default',
    profiles: {
        'Default': {
            activeGroup: 'Group 1',
            groups: {
                'Group 1': {
                    enabled: true,
                    shortcuts: {
                        'pp': { answer: 'PriPara', enabled: true },
                        'itpp': { answer: 'Idol Time PriPara', enabled: true },
                        'ilpp': { answer: 'Idol Land PriPara', enabled: true },
                        'kpc': { answer: 'Kiratto Pri☆Chan', enabled: true }
                    }
                }
            }
        }
    }
};

let shortcutData = JSON.parse(localStorage.getItem('amqShortcutPlusData'));

if (!shortcutData) {
    shortcutData = defaultData;
    saveData();
} else {
    // Migration
    let migrated = false;
    for (const pName in shortcutData.profiles) {
        let p = shortcutData.profiles[pName];
        if (!p.groups && !p.activeGroup) {
            let legacyShortcuts = {};
            for (const key in p) {
                if (typeof p[key] === "string") {
                    legacyShortcuts[key] = { answer: p[key], enabled: true };
                }
            }
            shortcutData.profiles[pName] = {
                activeGroup: 'Group 1',
                groups: {
                    'Group 1': {
                        enabled: true,
                        shortcuts: legacyShortcuts
                    }
                }
            };
            migrated = true;
        }
    }
    if (migrated) saveData();
}

// Data Handling Functions
function saveData() {
    localStorage.setItem('amqShortcutPlusData', JSON.stringify(shortcutData));
}

function getActiveShortcuts() {
    if (!shortcutData.enabled) return {};
    const profile = shortcutData.profiles[shortcutData.activeProfile];
    if (!profile || !profile.groups) return {};

    let active = {};
    for (const gName in profile.groups) {
        const g = profile.groups[gName];
        if (g.enabled) {
            for (const sKey in g.shortcuts) {
                const s = g.shortcuts[sKey];
                if (s.enabled) {
                    active[sKey] = s.answer;
                }
            }
        }
    }
    return active;
}

// Intercept Answer Input
const originalKeypress = $("#qpAnswerInput").keypress;

$("#qpAnswerInput").unbind("click keypress");
$("#qpAnswerInput").keypress((event) => {
    if (event.which === 13) {
        let answer = $("#qpAnswerInput").val();
        let activeShortcuts = getActiveShortcuts();

        if (shortcutData.enabled && answer in activeShortcuts) {
            quiz.answerInput.setNewAnswer(activeShortcuts[answer]);
        }
    }
});

// UI Setup
let shortcutWindow;
let awesomplete;

const loadInterval = setInterval(() => {
    if (document.querySelector("#loadingScreen.hidden")) {
        clearInterval(loadInterval);
        setupUI();

        awesomplete = new AutoCompleteController($("#aspNewValue"));
        ["Rejoining Player","Join Game", "Spectate Game", "get all song names"].forEach(l => new Listener(l, () => awesomplete.updateList()).bindListener())
    }
}, 500);

function setupUI() {
    // Add to Settings Menu
    $("#optionsContainer > ul").prepend(
        $(`<li class="clickAble" data-toggle="modal" data-target="#shortcutSettingsModal">Shortcut+</li>`)
        .on("click", () => {
            if (shortcutWindow.isVisible()) {
                shortcutWindow.close();
            } else {
                shortcutWindow.open();
                renderUI(); // Refresh UI when opening
            }
        })
    );

    localStorage.removeItem("setupWindow_amqShortcutWindow");

    // Create Window
    shortcutWindow = new AMQWindow({
        id: "amqShortcutWindow",
        title: "AMQ Shortcut+",
        width: 750,
        height: 700,
        minWidth: 400,
        minHeight: 300,
        zIndex: 1050,
        resizable: true,
        draggable: true
    });

    shortcutWindow.addPanel({
        id: "amqShortcutPanel",
        width: 1.0,
        height: "100%",
        scrollable: { x: false, y: true }
    });

    // Header Controls
    shortcutWindow.window.find(".modal-header").empty()
        .append($("<i>", { class: "fa fa-times clickAble", "aria-hidden": "true", style: "font-size: 25px; top: 8px; right: 15px; position: absolute;" })
                .on("click", () => {
        shortcutWindow.close();
    }))
        .append(`<h2>AMQ Shortcut+</h2>`);


    shortcutWindow.panels[0].panel.append(`
        <style>.aweblock > .awesomplete {display:block !important;}</style>
        <div id="aspContainer" style="padding: 10px;">
            <!-- Header row: Master Toggle and Profile Management -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #444;">
                <label style="margin: 0; cursor: pointer;">
                    <input type="checkbox" id="aspToggleEnabled" ${shortcutData.enabled ? "checked" : ""}> Enable Shortcuts
                </label>

                <div style="display: flex; gap: 5px; align-items: center;">
                    <span>Profile:</span>
                    <select id="aspProfileSelect" class="form-control" style="width: auto; height: 30px; padding: 0 5px; background-color: #2b2b2b; color: #d9d9d9; border: 1px solid #444; border-radius: 4px;"></select>
                    <button id="aspBtnRenameProfile" class="btn btn-warning btn-sm" title="Rename Profile"><i class="fa fa-pencil"></i></button>
                    <button id="aspBtnNewProfile" class="btn btn-primary btn-sm" title="New Profile"><i class="fa fa-plus"></i></button>
                    <button id="aspBtnDelProfile" class="btn btn-danger btn-sm" title="Delete Profile"><i class="fa fa-trash"></i></button>
                </div>
            </div>

            <!-- Import/Export row -->
            <div style="display: flex; justify-content: flex-end; gap: 5px; margin-bottom: 15px;">
                <input type="file" id="aspImportFile" accept=".json" style="display: none;">
                <button id="aspBtnImport" class="btn btn-info btn-sm" title="Import from Single Profile or Backup"><i class="fa fa-download"></i> Import Profiles</button>
                <div style="display: flex; gap: 5px;">
                    <button id="aspBtnExportCurrent" class="btn btn-info btn-sm" title="Export only the active profile (without its name)"><i class="fa fa-upload"></i> Export Profile</button>
                    <button id="aspBtnExport" class="btn btn-info btn-sm" title="Export all profiles as a full backup"><i class="fa fa-upload"></i> Export All</button>
                </div>
            </div>

            <!-- Add new shortcut row -->
            <div style="display: flex; gap: 5px; margin-bottom: 15px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px;">
                <input type="text" id="aspNewKey" class="form-control" placeholder="Shortcut" style="flex: 1; background-color: #2b2b2b; color: white; border: 1px solid #444;">
                <div class="aweblock" style="flex: 2;"><input type="text" id="aspNewValue" class="form-control" placeholder="Answer" style="background-color: #2b2b2b; color: white; border: 1px solid #444;"></div>
                <button id="aspBtnAdd" class="btn btn-success btn-sm">Add</button>
            </div>

            <!-- 2-Column Split: Groups on Left, Shortcuts on Right -->
            <div style="display: flex; gap: 4px; align-items: flex-start; margin-bottom: 10px; height: 400px;">

                <!-- Left: Profile Groups Tabs Stack -->
                <div id="aspGroupTabsContainer" style="display: flex; flex-direction: column; gap: 4px; width: ${shortcutData.settings?.groupWidth || 140}px; min-width: 100px; max-width: 400px; overflow-y: auto; overflow-x: hidden; max-height: 100%;">
                    <!-- Fixed Add Group Button -->
                    <div id="aspBtnNewGroup" class="asp-tab" style="display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 4px; cursor: pointer; background-color: rgba(255, 255, 255, 0.05); color: #d9d9d9; border: 1px solid #444; font-size: 14px; min-height: 33px; flex-shrink: 0;">
                        <i class="fa fa-plus"></i>
                    </div>
                    <!-- Tabs injected here -->
                </div>

                <!-- Resizer -->
                <div id="aspGroupResizer" class="asp-resizer" title="Drag to resize"></div>

                <!-- Right: Shortcut List -->
                <div style="flex: 1; height: 100%; overflow-y: auto; overflow-x: hidden; border: 1px solid #444; border-radius: 4px; background: rgba(0, 0, 0, 0.1);">
                    <table class="table" style="color: white; table-layout: fixed; word-wrap: break-word; margin-bottom: 0;">
                        <thead style="position: sticky; top: 0; background-color: #222; z-index: 1; box-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <tr>
                            <th style="width: 10%; text-align: center; border-bottom: none;">On</th>
                            <th style="width: 30%; border-bottom: none;">Shortcut</th>
                            <th style="width: 45%; border-bottom: none;">Answer</th>
                            <th style="width: 15%; text-align: center; border-bottom: none;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="aspShortcutList">
                    </tbody>
                </table>
            </div>

        </div>
    `);

    // Event Listeners for UI

    // Resizer Logic
    let isResizing = false;
    let lastDownX = 0;

    $("#aspGroupResizer").on("mousedown", function (e) {
        isResizing = true;
        lastDownX = e.clientX;
        $(this).addClass("active");
        $("body").css({ "cursor": "col-resize", "user-select": "none" });
        e.preventDefault();
    });

    $(document).on("mousemove", function (e) {
        if (!isResizing) return;
        const offsetRight = e.clientX - lastDownX;
        const $container = $("#aspGroupTabsContainer");
        let newWidth = $container.width() + offsetRight;

        if (newWidth < 100) newWidth = 100;
        if (newWidth > 400) newWidth = 400;

        $container.css("width", newWidth + "px");
        lastDownX = e.clientX;
    }).on("mouseup", function (e) {
        if (isResizing) {
            isResizing = false;
            $("#aspGroupResizer").removeClass("active");
            $("body").css({ "cursor": "", "user-select": "" });

            if (!shortcutData.settings) shortcutData.settings = {};
            shortcutData.settings.groupWidth = $("#aspGroupTabsContainer").width();
            saveData();
        }
    });

    // Master Toggle
    $("#aspToggleEnabled").on("change", function () {
        shortcutData.enabled = $(this).is(":checked");
        saveData();
    });

    // Profile Change
    $("#aspProfileSelect").on("change", function () {
        shortcutData.activeProfile = $(this).val();
        saveData();
        renderUI();
    });

    // Rename Profile
    $("#aspBtnRenameProfile").on("click", () => {
        const currentName = shortcutData.activeProfile;
        aspShowPrompt("Rename Profile", "", currentName, (newName) => {
            if (newName && newName.trim() !== "" && newName.trim() !== currentName) {
                const finalName = newName.trim();
                if (shortcutData.profiles[finalName]) {
                    aspShowAlert("Profile already exists.");
                    return;
                }
                shortcutData.profiles[finalName] = shortcutData.profiles[currentName];
                delete shortcutData.profiles[currentName];
                shortcutData.activeProfile = finalName;
                saveData();
                renderUI();
            }
        });
    });

    // New Profile
    $("#aspBtnNewProfile").on("click", () => {
        aspShowPrompt("Enter new profile name:", "", "", (name) => {
            if (name && name.trim() !== "") {
                name = name.trim();
                if (!shortcutData.profiles[name]) {
                    shortcutData.profiles[name] = { activeGroup: 'Group 1', groups: { 'Group 1': { enabled: true, shortcuts: {} } } };
                    shortcutData.activeProfile = name;
                    saveData();
                    renderUI();
                } else {
                    aspShowAlert("Profile already exists.");
                }
            }
        });
    });

    // Delete Profile
    $("#aspBtnDelProfile").on("click", () => {
        const p = shortcutData.activeProfile;
        if (Object.keys(shortcutData.profiles).length <= 1) {
            aspShowAlert("You cannot delete the last profile.");
            return;
        }
        aspShowConfirm("Delete Profile", `Are you sure you want to delete profile '${p}'?`, () => {
            delete shortcutData.profiles[p];
            shortcutData.activeProfile = Object.keys(shortcutData.profiles)[0];
            saveData();
            renderUI();
        });
    });

    // Add New Group
    $("#aspBtnNewGroup").on("click", () => {
        let p = shortcutData.profiles[shortcutData.activeProfile];
        if (!p) return;
        let i = 1;
        while (p.groups[`Group ${i}`]) i++;
        const newG = `Group ${i}`;
        p.groups[newG] = { enabled: true, shortcuts: {} };
        p.activeGroup = newG;
        saveData();
        renderTabs();
        renderShortcutList();
    });

    // Add Shortcut
    $("#aspBtnAdd").on("click", () => {
        const key = $("#aspNewKey").val().trim();
        const val = $("#aspNewValue").val().trim();

        if (key && val) {
            let p = shortcutData.profiles[shortcutData.activeProfile];

            // Check for duplication in all groups
            let existsInGroup = null;
            for (const gName in p.groups) {
                if (p.groups[gName].shortcuts[key]) {
                    existsInGroup = gName;
                    break;
                }
            }

            if (existsInGroup) {
                aspShowAlert(`Shortcut '${key}' already exists in group '${existsInGroup}'!`);
                return;
            }

            p.groups[p.activeGroup].shortcuts[key] = { answer: val, enabled: true };
            saveData();
            $("#aspNewKey").val("");
            $("#aspNewValue").val("");
            renderShortcutList();
            $("#aspNewKey").focus();
        }
    });

    // Handle Enter key in add form
    document.querySelector("#aspNewKey").addEventListener("keydown", e => {
        if (e.key === 'Enter') {
            $("#aspBtnAdd").click();
        }
        if (e.key === 'Tab') {
            document.querySelector("#aspNewValue").focus()
        }
    })
    document.querySelector("#aspNewValue").addEventListener("keydown", e => {
        if (e.key === 'Enter') {
            document.querySelector("#aspBtnAdd").click()
        }
        if (e.key === 'Tab') {
            document.querySelector("#aspBtnAdd").focus()
        }
    })

    // Import Button Proxy
    $("#aspBtnImport").on("click", () => {
        $("#aspImportFile").click();
    });

    // Export All Profiles
    $("#aspBtnExport").on("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(shortcutData.profiles, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "AMQ_ShortcutPlus_All_Profiles.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Export Current Profile
    $("#aspBtnExportCurrent").on("click", () => {
        const currentProfile = shortcutData.profiles[shortcutData.activeProfile];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentProfile, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `AMQ_ShortcutPlus_${shortcutData.activeProfile}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Modals
    let currentImportData = null;

    if ($("#aspConfirmModal").length === 0) {
        $("body").append(`
            <div class="modal fade" id="aspConfirmModal" tabindex="-1" role="dialog" style="z-index: 1060;">
                <div class="modal-dialog" role="document" style="width: 400px; margin-top: 15vh;">
                    <div class="modal-content" style="background-color: #1b1b1b; color: #d9d9d9; border: 1px solid #444; border-radius: 6px;">
                        <div class="modal-header" style="border-bottom: 1px solid #333;">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: white; opacity: 0.8;"><span aria-hidden="true">&times;</span></button>
                            <h4 class="modal-title" id="aspConfirmTitle">Confirm</h4>
                        </div>
                        <div class="modal-body">
                            <p id="aspConfirmMessage" style="white-space: pre-wrap; font-family: monospace;"></p>
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid #333;">
                            <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="aspBtnConfirmAction">Yes</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="aspPromptModal" tabindex="-1" role="dialog" style="z-index: 1060;">
                <div class="modal-dialog" role="document" style="width: 400px; margin-top: 15vh;">
                    <div class="modal-content" style="background-color: #1b1b1b; color: #d9d9d9; border: 1px solid #444; border-radius: 6px;">
                        <div class="modal-header" style="border-bottom: 1px solid #333;">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: white; opacity: 0.8;"><span aria-hidden="true">&times;</span></button>
                            <h4 class="modal-title" id="aspPromptTitle">Prompt</h4>
                        </div>
                        <div class="modal-body">
                            <p id="aspPromptMessage"></p>
                            <input type="text" id="aspPromptInput" class="form-control" style="background-color: #2b2b2b; color: white; border: 1px solid #444;">
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid #333;">
                            <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="aspBtnPromptAction">OK</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal fade" id="aspAlertModal" tabindex="-1" role="dialog" style="z-index: 1060;">
                <div class="modal-dialog" role="document" style="width: 400px; margin-top: 15vh;">
                    <div class="modal-content" style="background-color: #1b1b1b; color: #d9d9d9; border: 1px solid #444; border-radius: 6px;">
                        <div class="modal-header" style="border-bottom: 1px solid #333;">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: white; opacity: 0.8;"><span aria-hidden="true">&times;</span></button>
                            <h4 class="modal-title">AMQ Shortcut+</h4>
                        </div>
                        <div class="modal-body">
                            <p id="aspAlertMessage"></p>
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid #333;">
                            <button type="button" class="btn btn-primary" data-dismiss="modal">OK</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    // Shared Helper functions for UI
    window.aspShowAlert = function (msg) {
        $("#aspAlertMessage").text(msg);
        $("#aspAlertModal").modal("show");
    };

    window.aspShowConfirm = function (title, message, callback) {
        $("#aspConfirmTitle").text(title);
        $("#aspConfirmMessage").text(message);
        $("#aspBtnConfirmAction").off("click").on("click", () => {
            $("#aspConfirmModal").modal("hide");
            callback();
        });
        $("#aspConfirmModal").modal("show");
    };

    window.aspShowPrompt = function (title, message, defaultValue, callback) {
        $("#aspPromptTitle").text(title);
        $("#aspPromptMessage").text(message);
        $("#aspPromptInput").val(defaultValue);

        $("#aspBtnPromptAction").off("click").on("click", () => {
            const val = $("#aspPromptInput").val();
            $("#aspPromptModal").modal("hide");
            callback(val);
        });

        $("#aspPromptInput").off("keypress").on("keypress", function (e) {
            if (e.which === 13) $("#aspBtnPromptAction").click();
        });

        $("#aspPromptModal").on("shown.bs.modal", () => {
            $("#aspPromptInput").focus();
        }).modal("show");
    };

    // Specific Import Confirmation Logic
    function handleImportProfile(newName, incomingData) {
        // Validate and optionally migrate newly imported single-profile data
        let incoming = incomingData;
        if (!incoming.groups && !incoming.activeGroup) {
            let legacyShortcuts = {};
            for (const key in incoming) {
                if (typeof incoming[key] === "string") {
                    legacyShortcuts[key] = { answer: incoming[key], enabled: true };
                }
            }
            incoming = {
                activeGroup: 'Group 1',
                groups: { 'Group 1': { enabled: true, shortcuts: legacyShortcuts } }
            };
        }

        shortcutData.profiles[newName] = incoming;
        shortcutData.activeProfile = newName;
        saveData();
        renderUI();
        aspShowAlert(`Imported as profile '${newName}'`);
    }

    // Handle File Import
    $("#aspImportFile").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const contents = e.target.result;
            try {
                const parsed = JSON.parse(contents);

                if (typeof parsed !== 'object' || parsed === null) {
                    throw new Error("Invalid format");
                }
                let isBackup = false;
                for (const key in parsed) {
                    if (parsed.hasOwnProperty(key)) {
                        if (typeof parsed[key] === 'object' && parsed[key] !== null) {
                            if (parsed[key].groups || typeof Object.values(parsed)[0] === 'string') {
                                isBackup = true;
                            } else {
                                isBackup = true;
                            }
                        }
                    }
                }

                if (parsed.groups || parsed.activeGroup) {
                    isBackup = false;
                }

                if (isBackup) {
                    let newProfiles = [];
                    let existingProfiles = [];

                    for (const pName in parsed) {
                        if (parsed.hasOwnProperty(pName)) {
                            if (shortcutData.profiles[pName]) {
                                existingProfiles.push(pName);
                            } else {
                                newProfiles.push(pName);
                            }
                        }
                    }

                    if (newProfiles.length === 0 && existingProfiles.length === 0) {
                        aspShowAlert("The imported file does not contain any profiles.");
                        return;
                    }

                    let confirmMsg = "You are about to import multiple profiles.\n\n";
                    if (newProfiles.length > 0) {
                        confirmMsg += "Adding (New):\n" + newProfiles.map(n => " - " + n).join("\n") + "\n\n";
                    }
                    if (existingProfiles.length > 0) {
                        confirmMsg += "Overwriting (Existing):\n" + existingProfiles.map(n => " - " + n).join("\n") + "\n";
                    }
                    confirmMsg += "\nProceed with import?";

                    aspShowConfirm("Import All Profiles", confirmMsg, () => {
                        for (const pName in parsed) {
                            if (parsed.hasOwnProperty(pName)) {
                                let incoming = parsed[pName];
                                if (!incoming.groups && !incoming.activeGroup) {
                                    let legacyShortcuts = {};
                                    for (const skey in incoming) {
                                        if (typeof incoming[skey] === "string") {
                                            legacyShortcuts[skey] = { answer: incoming[skey], enabled: true };
                                        }
                                    }
                                    incoming = {
                                        activeGroup: 'Group 1',
                                        groups: { 'Group 1': { enabled: true, shortcuts: legacyShortcuts } }
                                    };
                                }
                                shortcutData.profiles[pName] = incoming;
                            }
                        }
                        saveData();
                        renderUI();
                        aspShowAlert("All Profiles imported successfully!");
                    });

                } else {
                    currentImportData = parsed;
                    aspShowPrompt("Name Imported Profile", "This file contains a single profile. What name would you like to give it?", "", (newName) => {
                        if (!newName || newName.trim() === "") return;
                        newName = newName.trim();
                        if (shortcutData.profiles[newName]) {
                            aspShowConfirm("Overwrite Profile", `Profile '${newName}' already exists. Overwrite?`, () => handleImportProfile(newName, currentImportData));
                        } else {
                            handleImportProfile(newName, currentImportData);
                        }
                    });
                }

            } catch (err) {
                aspShowAlert("Error importing profiles: " + err.message);
                console.error(err);
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });
}

function renderUI() {
    // Populate profile select
    const $select = $("#aspProfileSelect");
    $select.empty();

    for (const profileName in shortcutData.profiles) {
        $select.append($("<option>", {
            value: profileName,
            text: profileName
        }));
    }

    $select.val(shortcutData.activeProfile);
    renderTabs();
    renderShortcutList();
}

function renderTabs() {
    // Keep the fixed "Add" button and remove dynamic tabs below it
    const $tabsContainer = $("#aspGroupTabsContainer");
    $tabsContainer.find(".dynamic-tab").remove();

    let p = shortcutData.profiles[shortcutData.activeProfile];
    if (!p) return;

    // Default cleanup if corrupted
    if (!p.groups || Object.keys(p.groups).length === 0) {
        p.groups = { "Group 1": { enabled: true, shortcuts: {} } };
        p.activeGroup = "Group 1";
    }

    // Sort groups: Enabled first, Disabled last
    const groupNames = Object.keys(p.groups).sort((a, b) => {
        const enA = p.groups[a].enabled;
        const enB = p.groups[b].enabled;
        if (enA === enB) return a.localeCompare(b);
        return enA ? -1 : 1;
    });

    // Make sure active group is valid
    if (!p.groups[p.activeGroup]) {
        p.activeGroup = groupNames[0];
    }

    for (const gName of groupNames) {
        const group = p.groups[gName];
        const isActive = (p.activeGroup === gName);

        let color = "#d9d9d9";
        let bgColor = "rgba(255, 255, 255, 0.1)";
        if (isActive && group.enabled) bgColor = "rgba(66, 139, 202, 0.4)";
        if (!group.enabled) {
            color = "#888";
            bgColor = "rgba(0, 0, 0, 0.2)";
        }

        let $tab = $("<div>", {
            class: "asp-tab dynamic-tab",
            style: "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 4px; cursor: pointer; background-color: " + bgColor + "; color: " + color + "; user-select: none; border: 1px solid #444; font-size: 14px; flex-shrink: 0;"
        }).on("click", (e) => {
            // Prevent changing active tab when deleting or toggling
            if ($(e.target).closest('.asp-tab-controls').length === 0) {
                p.activeGroup = gName;
                saveData();
                renderTabs();
                renderShortcutList();
            }
        });

        // Left side wrapper (Checkbox + Label)
        let $leftSide = $("<div>", { style: "display: flex; align-items: center; gap: 6px; overflow: hidden; white-space: nowrap; flex: 1;" });

        // Checkbox to disable/enable group
        const $check = $("<input>", { type: "checkbox", class: "asp-tab-controls" }).prop("checked", group.enabled)
        .css({ cursor: "pointer", margin: 0, flexShrink: 0 })
        .on("change", function (e) {
            group.enabled = $(this).prop("checked");
            saveData();
            renderTabs();
            renderShortcutList(); // Because overall shortcuts change
        });

        // Name Label (double click to edit) with ellipsis truncation
        const $label = $("<span>", {
            text: gName,
            title: gName // Hover to see full name
        }).css({
            marginTop: "1px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
        }).on("dblclick", function (e) {
            e.stopPropagation();
            triggerGroupRename();
        });

        $leftSide.append($check).append($label);

        // Right side wrapper (Edit and Delete)
        let $rightSide = $("<div>", { style: "display: flex; align-items: center; gap: 4px; flex-shrink: 0;" });

        // Edit button
        const $edit = $("<i>", { class: "fa fa-pencil asp-tab-controls", title: "Rename" }).css({ fontSize: "12px", cursor: "pointer", opacity: 0.7 })
        .hover(function () { $(this).css('color', '#428bca'); }, function () { $(this).css('color', color); })
        .on("click", (e) => {
            e.stopPropagation();
            triggerGroupRename();
        });

        function triggerGroupRename() {
            aspShowPrompt("Rename group:", "", gName, (newName) => {
                if (newName && newName.trim() !== "" && newName.trim() !== gName) {
                    const finalName = newName.trim();
                    if (p.groups[finalName]) {
                        aspShowAlert("A group with that name already exists!");
                        return;
                    }
                    // Rename logic: recreate key
                    p.groups[finalName] = p.groups[gName];
                    delete p.groups[gName];
                    if (p.activeGroup === gName) p.activeGroup = finalName;
                    saveData();
                    renderTabs();
                    renderShortcutList();
                }
            });
        }

        // Delete button
        const $del = $("<i>", { class: "fa fa-times asp-tab-controls", title: "Delete" }).css({ fontSize: "12px", cursor: "pointer", opacity: 0.7 })
        .hover(function () { $(this).css('color', '#ff4444'); }, function () { $(this).css('color', color); })
        .on("click", (e) => {
            e.stopPropagation();
            if (Object.keys(p.groups).length <= 1) {
                aspShowConfirm("Clear Group", "Are you sure you want to clear this group?", () => {
                    p.groups[gName].shortcuts = {};
                    saveData();
                    renderShortcutList();
                });
                return;
            }

            aspShowConfirm("Delete Group", `Delete group '${gName}'?`, () => {
                delete p.groups[gName];
                if (p.activeGroup === gName) p.activeGroup = Object.keys(p.groups)[0];
                saveData();
                renderTabs();
                renderShortcutList();
            });
        });

        $rightSide.append($edit).append($del);
        $tab.append($leftSide).append($rightSide);
        $tabsContainer.append($tab);
    }
}


function renderShortcutList() {
    const $list = $("#aspShortcutList");
    $list.empty();

    const p = shortcutData.profiles[shortcutData.activeProfile];
    if (!p || !p.groups || !p.groups[p.activeGroup]) return;

    const activeGroupShortcuts = p.groups[p.activeGroup].shortcuts;
    const keys = Object.keys(activeGroupShortcuts).sort();

    if (keys.length === 0) {
        $list.append(`<tr><td colspan="4" style="text-align: center; color: #aaa;">No shortcuts in this group.</td></tr>`);
        return;
    }

    for (const key of keys) {
        const data = activeGroupShortcuts[key];

        let opacity = data.enabled ? 1.0 : 0.4;

        const $tr = $("<tr>").css("opacity", opacity)
        .append($("<td>", { style: "text-align: center;" }).append(
            $("<input>", { type: "checkbox" }).prop("checked", data.enabled).on("change", function () {
                data.enabled = $(this).prop("checked");
                saveData();
                renderShortcutList();
            })
        ))
        .append($("<td>", { text: key }))
        .append($("<td>", { text: data.answer }))
        .append($("<td>", { style: "text-align: center;" })
                .append($("<button>", { class: "btn btn-danger btn-xs", title: "Delete Shortcut" })
                        .append($("<i>", { class: "fa fa-remove" }))
                        .on("click", () => {
            delete activeGroupShortcuts[key];
            saveData();
            renderShortcutList();
        })
                       )
               );

        $list.append($tr);
    }
}
const style = document.createElement('style');
style.innerHTML = `
    #amqShortcutWindow .modal-header h2 {
        display: inline-block;
        margin: 6px 0 2px 8px;
        font-size: 23px;
    }
    #aspShortcutList td {
        vertical-align: middle;
        border-color: #444;
    }
    #aspShortcutList tr:nth-child(odd) {
        background-color: rgba(255, 255, 255, 0.05);
    }
    .asp-tab {
        box-sizing: border-box;
        min-height: 33px;
    }
    #aspGroupTabsContainer::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }
    #aspGroupTabsContainer::-webkit-scrollbar-thumb {
        background-color: #555;
        border-radius: 4px;
    }
    .asp-resizer {
        width: 6px;
        background-color: transparent;
        cursor: col-resize;
        border-radius: 3px;
        height: 100%;
        transition: background-color 0.2s;
        flex-shrink: 0;
    }
    .asp-resizer:hover, .asp-resizer.active {
        background-color: #555;
    }`;
document.head.appendChild(style);
