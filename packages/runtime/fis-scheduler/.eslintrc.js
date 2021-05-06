/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = {
    "ignorePatterns":["src/fisscheduler.ts","src/definitions.ts"],
    "extends": [
        "@fluidframework/eslint-config-fluid/eslint7"
    ],
    "rules": {
        "@typescript-eslint/strict-boolean-expressions": "off",
        "no-null/no-null": "off"
    }
}
