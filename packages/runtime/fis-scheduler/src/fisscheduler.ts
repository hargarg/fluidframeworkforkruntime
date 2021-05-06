/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventEmitter } from "events";
import { IRequest } from "@fluidframework/core-interfaces";
import { IAgentScheduler } from "@fluidframework/agent-scheduler";
import { DeltaManager } from "@fluidframework/container-loader";
import {
    FluidDataStoreRuntime,
    ISharedObjectRegistry,
} from "@fluidframework/datastore";
import { AttachState } from "@fluidframework/container-definitions";
import { ISharedMap, SharedMap } from "@fluidframework/map";
import {
    IFluidDataStoreRuntime,
    IChannelFactory,
} from "@fluidframework/datastore-definitions";
import {
    IFluidDataStoreContext,
    IFluidDataStoreFactory,
    NamedFluidDataStoreRegistryEntry,
} from "@fluidframework/runtime-definitions";
// import {
//     MessageType
// } from "@fluidframework/protocol-definitions";
import {
    IFISScheduler,
    IFISInitiateOperation,
    IFISStopOperation,
} from "./definitions";
class FISScheduler extends EventEmitter implements IFISScheduler {
    public static async load(
        runtime: IFluidDataStoreRuntime,
        context: IFluidDataStoreContext
    ) {
        let agentScheduler: IAgentScheduler;
        let root: ISharedMap;
        if (!runtime.existing) {
            root = SharedMap.create(runtime, "root");
            root.bindToContext();
        } else {
            root = (await runtime.getChannel("root")) as ISharedMap;
        }
        const agentSchedulerResponse = await context.containerRuntime.request({
            url: "/_scheduler",
        });
        if (agentSchedulerResponse.status === 404) {
            throw new Error("Agent scheduler not found");
        }
        agentScheduler = agentSchedulerResponse.value as IAgentScheduler;
        console.log(agentScheduler);
        const fisScheduler = new FISScheduler(runtime, context);
        fisScheduler.initialize();
        return fisScheduler;
    }

    constructor(
        private readonly runtime: IFluidDataStoreRuntime,
        private readonly context: IFluidDataStoreContext
    ) {
        super();
    }
    public async initiate(payload: any): Promise<void> {
        const startOp: IFISInitiateOperation = {
            type: "initiate",
            tenantId: "",
            documentId: this.runtime.documentId,
            collab_type: "",
            payload: payload,
        };
        console.log(this.context);
        // await this.context.submitMessage(startOp.type, startOp, (e)=>console.log(e));
        const deltamanager: DeltaManager = this.runtime
            .deltaManager as DeltaManager;
        deltamanager.submitRemoteHelpOp(startOp);
        return;
    }

    public async stop(payload: any): Promise<void> {
        const stopOp: IFISStopOperation = {
            type: "stop",
            tenantId: "",
            documentId: this.runtime.documentId,
            payload: payload,
        };
        const deltamanager: DeltaManager = this.runtime
            .deltaManager as DeltaManager;
        deltamanager.submitRemoteHelpOp(stopOp);
        return;
    }

    checkState() {
        throw new Error("Method not implemented.");
    }
    submitData(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    private initialize() {
        if (this.runtime.attachState === AttachState.Detached) {
            this.runtime
                .waitAttached()
                .then(() => {
                    console.log("ready for schedule");
                })
                .catch((error) => {
                    console.log("AgentScheduler_clearRunningTasks", error);
                });
        }
    }
}

class FISSchedulerRuntime extends FluidDataStoreRuntime {
    private readonly FISSchedulerP: Promise<FISScheduler>;
    constructor(
        dataStoreContext: IFluidDataStoreContext,
        sharedObjectRegistry: ISharedObjectRegistry
    ) {
        super(dataStoreContext, sharedObjectRegistry);
        this.FISSchedulerP = FISScheduler.load(this, dataStoreContext);
    }
    public async request(request: IRequest) {
        const response = await super.request(request);
        if (response.status === 404) {
            if (request.url === "" || request.url === "/") {
                const fisScheduler = await this.FISSchedulerP;
                return {
                    status: 200,
                    mimeType: "fluid/object",
                    value: fisScheduler,
                };
            }
        }
        return response;
    }
}

export class FISSchedulerFactory implements IFluidDataStoreFactory {
    public static readonly type = "_fisscheduler";
    public readonly type = FISSchedulerFactory.type;

    public get IFluidDataStoreFactory() {
        return this;
    }

    public static get registryEntry(): NamedFluidDataStoreRegistryEntry {
        return [this.type, Promise.resolve(new FISSchedulerFactory())];
    }

    public async instantiateDataStore(context: IFluidDataStoreContext) {
        const mapFactory = SharedMap.getFactory();

        const dataTypes = new Map<string, IChannelFactory>();
        dataTypes.set(mapFactory.type, mapFactory);

        return new FISSchedulerRuntime(context, dataTypes);
    }
}
