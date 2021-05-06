/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface IFISInitiateOperation {
    type: "initiate";
    tenantId: string;
    documentId: string;
    collab_type: string;
    payload: any;
}

export interface IFISStopOperation {
    type: "stop";
    tenantId: string;
    documentId: string;
    payload: any;
}

export enum FISBotStatus {
    Initiating = "Initiating",
    Running = "Running",
    Paused = "Paused",
    Stopped = "Stopped",
    Error = "Error",
}

export interface IFISScheduler {
    /**
     * trigger an operation to create the server instance of the document
     * @param payload  attach extra information if required with the operation // to-do identify the interface for payload
     */
    initiate(payload: any): Promise<void>;

    /**
     * trigger stop operation to the FIS instance on server
     */
    stop(payload: any): Promise<void>;

    /**
     * check state of the FISInstance
     */
    checkState();

    submitData(): Promise<void>;
}
