/**
 * On-screen adjustment panel shown only while bather view is active: eye height
 * (Y offset above the wave surface) and the camera's near clip plane. Works on any
 * device (not just touch) since these used to live in the desktop-only debug GUI.
 * Fades out after a period of inactivity and fades back in on any tap/click.
 */

const FADE_DELAY_MS = 10000;

export class BatherHud {
    private _container: HTMLDivElement;
    private _active: boolean;
    private _fadeTimer: number | null;
    private _paramRead: (name: string) => any;
    private _paramChanged: (name: string, value: any) => void;

    constructor(paramRead: (name: string) => any, paramChanged: (name: string, value: any) => void) {
        this._active = false;
        this._fadeTimer = null;
        this._paramRead = paramRead;
        this._paramChanged = paramChanged;

        const container = document.createElement("div");
        container.id = "batherHud";
        container.style.position = "fixed";
        container.style.top = "16px";
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.display = "none";
        container.style.pointerEvents = "auto";
        container.style.opacity = "1";
        container.style.transition = "opacity 0.6s ease";
        container.style.background = "rgba(0,0,0,0.55)";
        container.style.borderRadius = "12px";
        container.style.padding = "10px 16px";
        container.style.color = "#fff";
        container.style.fontFamily = "sans-serif";
        container.style.fontSize = "12px";
        container.style.zIndex = "60";
        container.style.userSelect = "none";

        container.appendChild(this._createSlider("Eye height", "batherYOffset", -0.5, 1.5, 0.01));
        container.appendChild(this._createSlider("Near clip", "cameraMinZ", 0.01, 5, 0.01));

        document.body.appendChild(container);
        this._container = container;

        document.addEventListener("pointerdown", this._onScreenTap, { capture: true });
    }

    public dispose(): void {
        document.removeEventListener("pointerdown", this._onScreenTap, { capture: true });
        if (this._fadeTimer !== null) {
            window.clearTimeout(this._fadeTimer);
        }
        this._container.remove();
    }

    public setBatherActive(active: boolean): void {
        this._active = active;
        this._container.style.display = active ? "flex" : "none";
        this._container.style.flexDirection = "column";
        this._container.style.gap = "6px";

        if (active) {
            this._reveal();
        } else if (this._fadeTimer !== null) {
            window.clearTimeout(this._fadeTimer);
            this._fadeTimer = null;
        }
    }

    private _onScreenTap = (): void => {
        if (this._active) {
            this._reveal();
        }
    };

    private _reveal(): void {
        this._container.style.opacity = "1";
        this._container.style.pointerEvents = "auto";

        if (this._fadeTimer !== null) {
            window.clearTimeout(this._fadeTimer);
        }

        this._fadeTimer = window.setTimeout(() => {
            this._container.style.opacity = "0";
            this._container.style.pointerEvents = "none";
        }, FADE_DELAY_MS);
    }

    private _createSlider(label: string, paramName: string, min: number, max: number, step: number): HTMLDivElement {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "8px";

        const labelEl = document.createElement("span");
        labelEl.textContent = label;
        labelEl.style.minWidth = "72px";

        const input = document.createElement("input");
        input.type = "range";
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(this._paramRead(paramName));
        input.style.width = "160px";
        (input.style as any).accentColor = "#46aaff";

        input.addEventListener("input", () => {
            this._paramChanged(paramName, parseFloat(input.value));
        });

        row.appendChild(labelEl);
        row.appendChild(input);

        return row;
    }
}
