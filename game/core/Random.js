// Run-local PRNG state is checkpointed; rendering uses the platform RNG separately.
let state=1
module.exports={seed(n){state=(n>>>0)||1},getState(){return state},random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}}
