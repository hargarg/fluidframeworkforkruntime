import { FlowDocument } from "@chaincode/flow-document";
import { FlowEditor } from "@chaincode/flow-editor";
import { Component } from "@prague/app-component";
import { ServicePlatform } from "@prague/component-runtime";
import {
    IContainerContext,
    IPlatform,
    IRuntime,
} from "@prague/container-definitions";
import { IComponent } from "@prague/runtime-definitions";
import { Scheduler } from "../../flow-util/dist";
import { HostView } from "./host";
import { importDoc } from "./template";

export class FlowHost extends Component {
    public static readonly type = "@chaincode/flow-host2";

    protected async create() {
        await Promise.all([
            this.runtime.createAndAttachComponent(this.docId, FlowDocument.type),
            this.runtime.createAndAttachComponent("math", "@chaincode/math"),
        ]);

        const url = new URL(window.location.href);
        const template = url.searchParams.get("template");
        if (template) {
            importDoc(
                this.runtime.openComponent(this.docId, /* wait: */ true),
                template,
            );
        }
    }

    protected async opened() {
        const docP = this.runtime.openComponent<FlowDocument>(this.docId, /* wait: */ true);
        const mathP = this.openPlatform("math").then(
            (platform) => platform.queryInterface<{ create: () => IComponent }>("collection"));
        const div = await this.platform.queryInterface<Element>("div");

        const scheduler = new Scheduler();
        const viewport = new HostView();
        viewport.attach(div, { scheduler, doc: await docP, math: await mathP });
    }

    private get docId() { return `${this.id}-doc`; }

    private async openPlatform(id: string): Promise<IPlatform> {
        const runtime = await this.context.getComponentRuntime(id, true);
        const component = await runtime.request({ url: "/" });

        if (component.status !== 200 || component.mimeType !== "prague/component") {
            return Promise.reject("Not found");
        }

        const result = component.value as IComponent;
        return result.attach(new ServicePlatform([]));
    }
}

/**
 * Instantiates a new chaincode host
 */
export async function instantiateRuntime(context: IContainerContext): Promise<IRuntime> {
    return Component.instantiateRuntime(
        context,
        FlowHost.type,
        new Map([
            [FlowHost.type, Promise.resolve(Component.createComponentFactory(FlowHost))],
            [FlowDocument.type, Promise.resolve(Component.createComponentFactory(FlowDocument))],
            [FlowEditor.type, Promise.resolve(Component.createComponentFactory(FlowEditor))],
            ["@chaincode/math", import("@chaincode/math")],
            // Bootstrap CSS definitions conflict with flow-scroll
            // ["@chaincode/progress-bars", import("@chaincode/progress-bars")],
        ]));
}
