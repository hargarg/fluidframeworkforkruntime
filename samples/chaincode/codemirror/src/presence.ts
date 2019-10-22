/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IComponentRuntime, IInboundSignalMessage } from "@microsoft/fluid-runtime-definitions";
import * as CodeMirror from "codemirror";
import { EventEmitter } from "events";

interface IPresenceInfo {
    userId: string;
    color: IColor;
    location: any;
}

interface IColor {
    name: string;
    rgb: {
        r: number;
        g: number;
        b: number;
    };
}

/**
 * This should be super generic and only do really generic things.
 * This will only take a dependency on the runtime.
 */
class PresenceManager extends EventEmitter {
    private presenceKey: string;
    private presenceMap: Map<string, IPresenceInfo> = new Map();

    public constructor(private runtime: IComponentRuntime) {
        super();
        this.presenceKey = `presence-${runtime.id}`;

        runtime.on("signal", (message: IInboundSignalMessage, local: boolean) => {
            // only process presence keys that are not local while we are connected
            if (message.type === this.presenceKey && !local && runtime.connected) {
                console.log(`received new presence signal: ${JSON.stringify(message)}`);
                const presenceInfo = {
                    userId: message.clientId,
                    color: this.getColor(message.clientId),
                    location: message.content,
                };
                this.presenceMap.set(message.clientId, presenceInfo);
                this.emit("newPresence", presenceInfo);
            }
        });
    }

    public send(location: {}) { 
        if (this.runtime.connected) {
            console.log(`sending new presence signal: ${JSON.stringify(location)}`);  
            this.runtime.submitSignal(this.presenceKey, location);
        }
    }

    private getColor(id: string): IColor  {
        let sum = 0;
        for (let i = 0; i < id.length; i++) {
            sum += id[i].charCodeAt(0);
        }

        const colorMap: IColor[] = [
            {
                name: "blue",
                rgb: {
                    r: 0,
                    g: 0,
                    b: 255,
                }
            },
            {
                name: "green",
                rgb: {
                    r: 0,
                    g: 255,
                    b: 0,
                }
            },
            {
                name: "red",
                rgb: {
                    r: 255,
                    g: 0,
                    b: 0,
                }
            },
            {
                name: "light blue",
                rgb: {
                    r: 80,
                    g: 208,
                    b: 255,
                }
            },
            {
                name: "orange",
                rgb: {
                    r: 255,
                    g: 160,
                    b: 16,
                }
            },
            {
                name: "pink",
                rgb: {
                    r: 255,
                    g: 96,
                    b: 208,
                }
            },
        ];

        return colorMap[sum % colorMap.length];
    }
}

interface ICodeMirrorPresenceInfo {
    cursor: HTMLSpanElement;
    markers: CodeMirror.TextMarker[];
    info: IPresenceInfo;
}

/**
 * This will be the codemirror specific implementation
 */
export class CodeMirrorPresenceManager extends EventEmitter {
    private presenceManager: PresenceManager;
    private presenceMap: Map<string, ICodeMirrorPresenceInfo> = new Map();

    private get doc(): CodeMirror.Doc {
        return this.codeMirror.getDoc();
    }

    public constructor(private codeMirror: CodeMirror.EditorFromTextArea, runtime: IComponentRuntime) {
        super();
        this.presenceManager = new PresenceManager(runtime);

        this.codeMirror.on("cursorActivity", () => {
            const selection = this.doc.listSelections();
            this.presenceManager.send(selection);
        });
        
        this.presenceManager.on("newPresence", (presenceInfo: IPresenceInfo) => {
            if (this.presenceMap.has(presenceInfo.userId)) {
                const previousUserInfo= this.presenceMap.get(presenceInfo.userId);
                
                // clean all the previous markers
                previousUserInfo.markers.forEach(marker => {
                    marker.clear();
                });

                // Clean the previous cursor
                previousUserInfo.cursor.remove();
            }

            // Selection highlighting
            const style = {
                css: `background-color: rgba(${presenceInfo.color.rgb.r}, ${presenceInfo.color.rgb.g}, ${presenceInfo.color.rgb.b}, 0.3)`,
            };

            const markers: CodeMirror.TextMarker[] = []
            presenceInfo.location.forEach(range => {
                const head = this.doc.indexFromPos(range.head);
                const anchor = this.doc.indexFromPos(range.anchor);
                if (head > anchor) {
                    markers.push(this.doc.markText(range.anchor, range.head, style));
                } else {
                    markers.push(this.doc.markText(range.head, range.anchor, style));
                }
            });

            // Cursor positioning
            const cursor = document.createElement("span");
            cursor.id = `cursor-${presenceInfo.userId}`;
            cursor.style.width = "1px";
            cursor.style.backgroundColor = `rgb(${presenceInfo.color.rgb.r}, ${presenceInfo.color.rgb.g}, ${presenceInfo.color.rgb.b})`;
            cursor.style.height = "15px";
            cursor.style.marginTop = "-15px";
            cursor.style.zIndex = "1"; // Set the ip above local selection

            const cursorDot = document.createElement("span");
            cursorDot.style.height = "4px";
            cursorDot.style.width = "4px";
            cursorDot.style.backgroundColor = `rgb(${presenceInfo.color.rgb.r}, ${presenceInfo.color.rgb.g}, ${presenceInfo.color.rgb.b})`;
            cursorDot.style.borderRadius = "50%";
            cursorDot.style.position = "absolute";
            cursorDot.style.marginTop = "-2px";
            cursor.appendChild(cursorDot);
            

            const newUserInfo: ICodeMirrorPresenceInfo = {
                cursor,
                markers,
                info: presenceInfo,
            }

            this.presenceMap.set(presenceInfo.userId, newUserInfo);
            this.codeMirror.addWidget(presenceInfo.location[0].head, cursor, true);
        });
    }
}
