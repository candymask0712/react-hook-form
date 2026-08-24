/**
 * This file, when executed with the react-server condition in the postbuild
 * lifecycle, ensures that the server output is valid and only exposes APIs
 * that do not depend on React client features.
 */
import * as exported from 'react-hook-form';
import assert from 'assert';

const expected = ['appendErrors', 'createFormControl', 'get', 'set'];

assert.deepStrictEqual(Object.keys(exported), expected);
