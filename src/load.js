import * as simple from "./simple.js";
import * as subset from "./subset.js";
import * as combine from "./combine.js";
import * as transpose from "./transpose.js";
import * as unary_a from "./unary_arith.js";
import * as unary_m from "./unary_math.js";
import * as dimnames from "./dimnames.js";
import * as scran from "scran.js";
import * as ov from "./overrides.js";

/**
 * Class representing a single numeric matrix with its contents stored on **scran.js**'s Wasm heap.
 * @external ScranMatrix
 * @see {@link https://www.jkanche.com/scran.js/ScranMatrix.html}
 */

/**
 * Class representing a Group inside a HDF5 file.
 * This may also be the file itself, which is treated as a root group.
 * @external H5Group
 * @see {@link https://www.jkanche.com/scran.js/H5Group.html}
 */

/**
 * Load a delayed matrix from a **chihaya**-formatted HDF5 file into a [ScranMatrix](https://jkanche.github.io/scran.js/ScranMatrix.html) object.
 *
 * @param {string} path - Path to the file.
 * On browsers, this file should be present on the virtual file system, see [`writeFile`](https://www.jkanche.com/scran.js/global.html#writeFile).
 * @param {string} name - Name of the group representing the delayed matrix.
 *
 * @return {Promise<external:ScranMatrix>} Promise resolving to a {@linkplain external:ScranMatrix ScranMatrix} containing the delayed matrix.
 */
export function load(path, name) {
    let handle = new scran.H5Group(path, name);
    return loadHandle(handle);
}

/**
 * Load a delayed matrix from a HDF5 handle into a {@linkplain external:ScranMatrix ScranMatrix} object.
 * This can be used by developers to load delayed array seeds in handlers for custom operations.
 *
 * @param {external:H5Group} path - Handle to a HDF5 group.
 *
 * @return {Promise<external:ScranMatrix>} Promise resolving to a {@linkplain external:ScranMatrix ScranMatrix} containing the delayed matrix.
 */
export function loadHandle(handle) {
    if (handle.attributes.indexOf("delayed_type") == -1) {
        throw new Error("expected a 'delayed_type' attribute");
    }
    let type = handle.readAttribute("delayed_type");

    if (type.values[0] == "operation") {
        if (handle.attributes.indexOf("delayed_operation") == -1) {
            throw new Error("expected a 'delayed_operation' attribute");
        }
        let op_raw = handle.readAttribute("delayed_operation");
        let op = op_raw.values[0];

        if (op in ov.operation_overrides) {
            return ov.operation_overrides[op](handle);
        }

        if (op == "subset") {
            return subset.load_subset(handle);
        } else if (op == "combine") {
            return combine.load_combine(handle);
        } else if (op == "transpose") {
            return transpose.load_transpose(handle);
        } else if (op == "unary arithmetic") {
            return unary_a.load_unary_arithmetic(handle);
        } else if (op == "unary math") {
            return unary_m.load_unary_math(handle);
        } else if (op == "dimnames") {
            return dimnames.load_dimnames(handle);
        } else {
            throw new Error("delayed operation '" + op + "' is currently not supported");
        }

    } else if (type.values[0] == "array") {
        if (handle.attributes.indexOf("delayed_array") == -1) {
            throw new Error("expected a 'delayed_array' attribute");
        }
        let arr_raw = handle.readAttribute("delayed_array");
        let arr = arr_raw.values[0];

        if (arr in ov.array_overrides) {
            return ov.array_overrides[arr](handle);
        }

        if (arr == "dense array") {
            return simple.load_dense_array(handle);
        } else if (arr == "sparse matrix") {
            return simple.load_csparse_matrix(handle);
        } else {
            throw new Error("array type '" + arr + "' is currently not supported");
        }

    } else {
        throw new Error("unknown value for the 'delayed_type' attribute");
    }
}
