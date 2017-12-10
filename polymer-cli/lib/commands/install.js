"use strict";
/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class InstallCommand {
    constructor() {
        this.name = 'install';
        this.aliases = ['i'];
        // TODO(justinfagnani): Expand and link to eventual doc on variants.
        this.description = 'installs Bower dependencies, optionally installing "variants"';
        this.args = [
            {
                name: 'variants',
                type: Boolean,
                defaultValue: false,
                description: 'Whether to install variants'
            },
            {
                name: 'offline',
                type: Boolean,
                defaultValue: false,
                description: 'Don\'t hit the network'
            },
        ];
    }
    run(options, _config) {
        return __awaiter(this, void 0, void 0, function* () {
            // Defer dependency loading until this specific command is run
            const install = require('../install/install').install;
            yield install(options);
        });
    }
}
exports.InstallCommand = InstallCommand;