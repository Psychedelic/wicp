import {
    aliceActor,
    aliceIdentity,
    bobActor,
    bobIdentity,
    custodianActor,
    custodianIdentity,
    johnActor,
    johnIdentity
} from "../setup";
import test from "ava";

const normalActors = [aliceActor, bobActor, johnActor];
const allActors = [...normalActors, custodianActor];

