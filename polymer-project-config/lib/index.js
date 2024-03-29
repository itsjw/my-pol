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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const jsonschema = require("jsonschema");
const path = require("path");
const logging = require("plylog");
const builds_1 = require("./builds");
const minimatchAll = require("minimatch-all");
var builds_2 = require("./builds");
exports.applyBuildPreset = builds_2.applyBuildPreset;
const logger = logging.getLogger('polymer-project-config');
/**
 * The default globs for matching all user application source files.
 */
exports.defaultSourceGlobs = ['src/**/*'];
/**
 * Resolve any glob or path from the given path, even if glob
 * is negative (begins with '!').
 */
function globResolve(fromPath, glob) {
    if (glob.startsWith('!')) {
        const includeGlob = glob.substring(1);
        return '!' + path.resolve(fromPath, includeGlob);
    }
    else {
        return path.resolve(fromPath, glob);
    }
}
/**
 * Returns a relative path for a glob or path, even if glob
 * is negative (begins with '!').
 */
function globRelative(fromPath, glob) {
    if (glob.startsWith('!')) {
        return '!' + path.relative(fromPath, glob.substr(1));
    }
    return path.relative(fromPath, glob);
}
/**
 * Returns a positive glob, even if glob is negative (begins with '!')
 */
function getPositiveGlob(glob) {
    if (glob.startsWith('!')) {
        return glob.substring(1);
    }
    else {
        return glob;
    }
}
/**
 * Given a user-provided options object, check for deprecated options. When one
 * is found, warn the user and fix if possible.
 */
function fixDeprecatedOptions(options) {
    if (typeof options.sourceGlobs !== 'undefined') {
        logger.warn('"sourceGlobs" config option has been renamed to "sources" and will no longer be supported in future versions');
        options.sources = options.sources || options.sourceGlobs;
    }
    if (typeof options.includeDependencies !== 'undefined') {
        logger.warn('"includeDependencies" config option has been renamed to "extraDependencies" and will no longer be supported in future versions');
        options.extraDependencies =
            options.extraDependencies || options.includeDependencies;
    }
    // TODO(rictic): two releases after v3.5.0, start warning about
    //     options.lint.ignoreWarnings. For now we'll start by just
    //     making them always point to the same object.
    if (options.lint && options.lint.warningsToIgnore) {
        options.lint.ignoreWarnings = options.lint.warningsToIgnore;
    }
    else if (options.lint && options.lint.ignoreWarnings) {
        options.lint.warningsToIgnore = options.lint.ignoreWarnings;
    }
    return options;
}
class ProjectConfig {
    /**
     * constructor - given a ProjectOptions object, create the correct project
     * configuration for those options. This involves setting the correct
     * defaults, validating options, warning on deprecated options, and
     * calculating some additional properties.
     */
    constructor(options) {
        this.lint = undefined;
        options = (options) ? fixDeprecatedOptions(options) : {};
        /**
         * root
         */
        if (options.root) {
            this.root = path.resolve(options.root);
        }
        else {
            this.root = process.cwd();
        }
        /**
         * entrypoint
         */
        if (options.entrypoint) {
            this.entrypoint = path.resolve(this.root, options.entrypoint);
        }
        else {
            this.entrypoint = path.resolve(this.root, 'index.html');
        }
        /**
         * shell
         */
        if (options.shell) {
            this.shell = path.resolve(this.root, options.shell);
        }
        /**
         * fragments
         */
        if (options.fragments) {
            this.fragments = options.fragments.map((e) => path.resolve(this.root, e));
        }
        else {
            this.fragments = [];
        }
        /**
         * extraDependencies
         */
        this.extraDependencies = (options.extraDependencies ||
            []).map((glob) => globResolve(this.root, glob));
        /**
         * sources
         */
        this.sources = (options.sources || exports.defaultSourceGlobs)
            .map((glob) => globResolve(this.root, glob));
        this.sources.push(this.entrypoint);
        if (this.shell) {
            this.sources.push(this.shell);
        }
        if (this.fragments) {
            this.sources = this.sources.concat(this.fragments);
        }
        /**
         * allFragments
         */
        this.allFragments = [];
        // It's important that shell is first for document-ordering of imports
        if (this.shell) {
            this.allFragments.push(this.shell);
        }
        if (this.fragments) {
            this.allFragments = this.allFragments.concat(this.fragments);
        }
        if (this.allFragments.length === 0) {
            this.allFragments.push(this.entrypoint);
        }
        if (options.lint) {
            this.lint = options.lint;
        }
        /**
         * builds
         */
        if (options.builds) {
            this.builds = options.builds;
            if (Array.isArray(this.builds)) {
                this.builds = this.builds.map(builds_1.applyBuildPreset);
            }
        }
    }
    /**
     * Given an absolute file path to a polymer.json-like ProjectOptions object,
     * read that file. If no file exists, null is returned. If the file exists
     * but there is a problem reading or parsing it, throw an exception.
     *
     * TODO: in the next major version we should make this method and the one
     *     below async.
     */
    static loadOptionsFromFile(filepath) {
        try {
            const configContent = fs.readFileSync(filepath, 'utf-8');
            const contents = JSON.parse(configContent);
            return this.validateOptions(contents);
        }
        catch (error) {
            // swallow "not found" errors because they are so common / expected
            if (error && error.code === 'ENOENT') {
                logger.debug('no polymer config file found', { file: filepath });
                return null;
            }
            // otherwise, throw an exception
            throw error;
        }
    }
    /**
     * Given an absolute file path to a polymer.json-like ProjectOptions object,
     * return a new ProjectConfig instance created with those options.
     */
    static loadConfigFromFile(filepath) {
        const configParsed = ProjectConfig.loadOptionsFromFile(filepath);
        if (!configParsed) {
            return null;
        }
        return new ProjectConfig(configParsed);
    }
    /**
     * Returns the given configJsonObject if it is a valid ProjectOptions object,
     * otherwise throws an informative error message.
     */
    static validateOptions(configJsonObject) {
        const validator = new jsonschema.Validator();
        const result = validator.validate(configJsonObject, getSchema());
        if (result.errors.length > 0) {
            const error = result.errors[0];
            if (!error.property && !error.message) {
                throw error;
            }
            let propertyName = error.property;
            if (propertyName.startsWith('instance.')) {
                propertyName = propertyName.slice(9);
            }
            throw new Error(`Property '${propertyName}' ${error.message}`);
        }
        return configJsonObject;
    }
    /**
     * Returns a new ProjectConfig from the given JSON object if it's valid.
     *
     * TODO(rictic): For the next major version we should mark the constructor
     * private, or perhaps make it validating. Also, we should standardize the
     * naming scheme across the static methods on this class.
     *
     * Throws if the given JSON object is an invalid ProjectOptions.
     */
    static validateAndCreate(configJsonObject) {
        const options = this.validateOptions(configJsonObject);
        return new this(options);
    }
    isFragment(filepath) {
        return this.allFragments.indexOf(filepath) !== -1;
    }
    isShell(filepath) {
        return (!!this.shell && (this.shell === filepath));
    }
    isSource(filepath) {
        return minimatchAll(filepath, this.sources);
    }
    /**
     * Validates that a configuration is accurate, and that all paths are
     * contained within the project root.
     */
    validate() {
        const validateErrorPrefix = `Polymer Config Error`;
        if (this.entrypoint) {
            console.assert(this.entrypoint.startsWith(this.root), `${validateErrorPrefix}: entrypoint (${this.entrypoint}) ` +
                `does not resolve within root (${this.root})`);
        }
        if (this.shell) {
            console.assert(this.shell.startsWith(this.root), `${validateErrorPrefix}: shell (${this.shell}) ` +
                `does not resolve within root (${this.root})`);
        }
        this.fragments.forEach((f) => {
            console.assert(f.startsWith(this.root), `${validateErrorPrefix}: a "fragments" path (${f}) ` +
                `does not resolve within root (${this.root})`);
        });
        this.sources.forEach((s) => {
            console.assert(getPositiveGlob(s).startsWith(this.root), `${validateErrorPrefix}: a "sources" path (${s}) ` +
                `does not resolve within root (${this.root})`);
        });
        this.extraDependencies.forEach((d) => {
            console.assert(getPositiveGlob(d).startsWith(this.root), `${validateErrorPrefix}: an "extraDependencies" path (${d}) ` +
                `does not resolve within root (${this.root})`);
        });
        // TODO(fks) 11-14-2016: Validate that files actually exist in the file
        // system. Potentially become async function for this.
        if (this.builds) {
            console.assert(Array.isArray(this.builds), `${validateErrorPrefix}: "builds" (${this.builds}) ` +
                `expected an array of build configurations.`);
            if (this.builds.length > 1) {
                const buildNames = new Set();
                for (const build of this.builds) {
                    const buildName = build.name;
                    const buildPreset = build.preset;
                    console.assert(!buildPreset || builds_1.isValidPreset(buildPreset), `${validateErrorPrefix}: "${buildPreset}" is not a valid ` +
                        ` "builds" preset.`);
                    console.assert(buildName, `${validateErrorPrefix}: all "builds" require ` +
                        `a "name" property when there are multiple builds defined.`);
                    console.assert(!buildNames.has(buildName), `${validateErrorPrefix}: "builds" duplicate build name ` +
                        `"${buildName}" found. Build names must be unique.`);
                    buildNames.add(buildName);
                }
            }
        }
        return true;
    }
    /**
     * Generate a JSON string serialization of this configuration. File paths
     * will be relative to root.
     */
    toJSON() {
        let lintObj = undefined;
        if (this.lint) {
            lintObj = Object.assign({}, this.lint);
            delete lintObj.ignoreWarnings;
        }
        const obj = {
            entrypoint: globRelative(this.root, this.entrypoint),
            shell: this.shell ? globRelative(this.root, this.shell) : undefined,
            fragments: this.fragments.map((absolutePath) => {
                return globRelative(this.root, absolutePath);
            }),
            sources: this.sources.map((absolutePath) => {
                return globRelative(this.root, absolutePath);
            }),
            extraDependencies: this.extraDependencies.map((absolutePath) => {
                return globRelative(this.root, absolutePath);
            }),
            builds: this.builds,
            lint: lintObj,
        };
        return JSON.stringify(obj, null, 2);
    }
}
exports.ProjectConfig = ProjectConfig;
// Gets the json schema for polymer.json, generated from the typescript
// interface for runtime validation. See the build script in package.json for
// more info.
const getSchema = (() => {
    let schema;
    return () => {
        if (schema === undefined) {
            schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'schema.json'), 'utf-8'));
        }
        return schema;
    };
})();
