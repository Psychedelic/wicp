#!/bin/bash

cargo build --target wasm32-unknown-unknown --release --package wicp

ic-cdk-optimizer ./target/wasm32-unknown-unknown/release/wicp.wasm -o ./target/wasm32-unknown-unknown/release/wicp-opt.wasm
