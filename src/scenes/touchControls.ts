/**
 * On-screen touch controls for mobile/tablet devices: a movement D-pad, ascend/descend
 * and sprint buttons, and a bather view toggle. Each button drives the camera by
 * dispatching the same keyboard events a physical keyboard would send, so it reuses
 * the existing FreeCameraKeyboardMoveInput movement logic instead of duplicating it.
 */

const KEY_CODES = {
    up: 38,
    down: 40,
    left: 37,
    right: 39,
    ascend: 33,
    descend: 34,
    shift: 16,
};

export class TouchControls {
    private _element: HTMLElement;
    private _container: HTMLDivElement;
    private _batherButton: HTMLDivElement;
    private _verticalButtons: HTMLDivElement[];

    public static isTouchDevice(): boolean {
        return (
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches)
        );
    }

    constructor(element: HTMLElement, onBatherToggle: () => void) {
        this._element = element;
        this._verticalButtons = [];

        const container = document.createElement("div");
        container.id = "touchControls";
        container.style.position = "fixed";
        container.style.left = "0";
        container.style.top = "0";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.pointerEvents = "none";
        container.style.zIndex = "50";
        container.style.userSelect = "none";
        document.body.appendChild(container);
        this._container = container;

        container.appendChild(this._createDPad());
        container.appendChild(this._createVerticalButtons());
        container.appendChild(this._createSprintButton());

        this._batherButton = this._createIconButton("🏊", { left: "16px", top: "16px" }, 64);
        this._batherButton.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            onBatherToggle();
        });
        container.appendChild(this._batherButton);

        window.addEventListener("blur", this._releaseAll);
    }

    public dispose(): void {
        window.removeEventListener("blur", this._releaseAll);
        this._container.remove();
    }

    public setBatherActive(active: boolean): void {
        this._batherButton.style.background = active ? "rgba(70,170,255,0.7)" : "rgba(255,255,255,0.25)";
        this._verticalButtons.forEach((btn) => {
            btn.style.opacity = active ? "0.35" : "1";
            btn.style.pointerEvents = active ? "none" : "auto";
        });
    }

    private _releaseAll = (): void => {
        this._sendKey("keyup", KEY_CODES.up, "ArrowUp");
        this._sendKey("keyup", KEY_CODES.down, "ArrowDown");
        this._sendKey("keyup", KEY_CODES.left, "ArrowLeft");
        this._sendKey("keyup", KEY_CODES.right, "ArrowRight");
        this._sendKey("keyup", KEY_CODES.ascend, "PageUp");
        this._sendKey("keyup", KEY_CODES.descend, "PageDown");
        this._sendKey("keyup", KEY_CODES.shift, "Shift");
    };

    private _sendKey(type: "keydown" | "keyup", keyCode: number, key: string): void {
        const init = { key, keyCode, which: keyCode, bubbles: true } as unknown as KeyboardEventInit;
        this._element.dispatchEvent(new KeyboardEvent(type, init));
    }

    private _createDPad(): HTMLDivElement {
        const wrap = document.createElement("div");
        wrap.style.position = "fixed";
        wrap.style.left = "16px";
        wrap.style.bottom = "16px";
        wrap.style.width = "168px";
        wrap.style.height = "168px";
        wrap.style.pointerEvents = "none";

        const positions: [string, keyof typeof KEY_CODES, string, Partial<CSSStyleDeclaration>][] = [
            ["▲", "up", "ArrowUp", { left: "56px", top: "0px" }],
            ["▼", "down", "ArrowDown", { left: "56px", top: "112px" }],
            ["◀", "left", "ArrowLeft", { left: "0px", top: "56px" }],
            ["▶", "right", "ArrowRight", { left: "112px", top: "56px" }],
        ];

        for (const [label, keyName, keyValue, style] of positions) {
            const btn = this._createButton(label, style, 56);
            this._bindHoldButton(btn, KEY_CODES[keyName], keyValue);
            wrap.appendChild(btn);
        }

        return wrap;
    }

    private _createVerticalButtons(): HTMLDivElement {
        const wrap = document.createElement("div");
        wrap.style.position = "fixed";
        wrap.style.right = "16px";
        wrap.style.bottom = "96px";
        wrap.style.display = "flex";
        wrap.style.flexDirection = "column";
        wrap.style.gap = "12px";
        wrap.style.pointerEvents = "none";

        const up = this._createIconButton("＋", {}, 52, "static");
        this._bindHoldButton(up, KEY_CODES.ascend, "PageUp");
        wrap.appendChild(up);

        const down = this._createIconButton("－", {}, 52, "static");
        this._bindHoldButton(down, KEY_CODES.descend, "PageDown");
        wrap.appendChild(down);

        this._verticalButtons.push(up, down);

        return wrap;
    }

    private _createSprintButton(): HTMLDivElement {
        const btn = this._createIconButton("⚡", { right: "16px", bottom: "16px" }, 64);
        this._bindHoldButton(btn, KEY_CODES.shift, "Shift");
        return btn;
    }

    private _createButton(label: string, style: Partial<CSSStyleDeclaration>, size: number): HTMLDivElement {
        return this._createIconButton(label, style, size, "absolute");
    }

    private _createIconButton(label: string, style: Partial<CSSStyleDeclaration>, size: number, position: "fixed" | "absolute" | "static" = "fixed"): HTMLDivElement {
        const btn = document.createElement("div");
        btn.textContent = label;

        if (position !== "static") {
            btn.style.position = position;
        }

        Object.keys(style).forEach((key) => {
            (btn.style as any)[key] = (style as any)[key];
        });

        btn.style.width = `${size}px`;
        btn.style.height = `${size}px`;
        btn.style.borderRadius = "50%";
        btn.style.background = "rgba(255,255,255,0.25)";
        btn.style.border = "1px solid rgba(255,255,255,0.5)";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.fontSize = `${Math.round(size * 0.42)}px`;
        btn.style.color = "#fff";
        btn.style.pointerEvents = "auto";
        btn.style.touchAction = "none";
        btn.style.webkitUserSelect = "none";
        btn.style.userSelect = "none";
        (btn.style as any).webkitTapHighlightColor = "transparent";

        return btn;
    }

    private _bindHoldButton(btn: HTMLDivElement, keyCode: number, key: string): void {
        let pressed = false;

        const press = (e: PointerEvent): void => {
            e.preventDefault();
            btn.setPointerCapture(e.pointerId);
            if (!pressed) {
                pressed = true;
                btn.style.background = "rgba(70,170,255,0.7)";
                this._sendKey("keydown", keyCode, key);
            }
        };

        const release = (e: PointerEvent): void => {
            e.preventDefault();
            if (pressed) {
                pressed = false;
                btn.style.background = "rgba(255,255,255,0.25)";
                this._sendKey("keyup", keyCode, key);
            }
        };

        btn.addEventListener("pointerdown", press);
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("lostpointercapture", release);
    }
}
