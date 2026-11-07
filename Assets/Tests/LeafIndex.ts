import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {CprChestMarkScenario} from "./CprChestMarkScenario"
import {CprPacerScenario} from "./CprPacerScenario"
import {CprSwapCueScenario} from "./CprSwapCueScenario"
import {CprPadsScenario} from "./CprPadsScenario"
import {CprShockScenario} from "./CprShockScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "cpr-1-chest-mark", typename: CprChestMarkScenario.getTypeName()},
    {id: "cpr-2-pacer", typename: CprPacerScenario.getTypeName()},
    {id: "cpr-3-swap-cue", typename: CprSwapCueScenario.getTypeName()},
    {id: "cpr-4-pads", typename: CprPadsScenario.getTypeName()},
    {id: "cpr-5-shock-summary", typename: CprShockScenario.getTypeName()},
  ]
}
