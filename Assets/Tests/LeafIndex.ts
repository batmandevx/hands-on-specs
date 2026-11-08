import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {CprChestMarkScenario} from "./CprChestMarkScenario"
import {CprPacerScenario} from "./CprPacerScenario"
import {CprSwapCueScenario} from "./CprSwapCueScenario"
import {CprPadsScenario} from "./CprPadsScenario"
import {CprShockScenario} from "./CprShockScenario"
import {CprHandoverScenario} from "./CprHandoverScenario"
import {CprRestartScenario} from "./CprRestartScenario"
import {CprVoiceScenario} from "./CprVoiceScenario"
import {CprPushBarScenario} from "./CprPushBarScenario"
import {CprReanalysisScenario} from "./CprReanalysisScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "cpr-1-chest-mark", typename: CprChestMarkScenario.getTypeName()},
    {id: "cpr-2-pacer", typename: CprPacerScenario.getTypeName()},
    {id: "cpr-3-swap-cue", typename: CprSwapCueScenario.getTypeName()},
    {id: "cpr-4-pads", typename: CprPadsScenario.getTypeName()},
    {id: "cpr-5-shock-summary", typename: CprShockScenario.getTypeName()},
    {id: "cpr-6-handover", typename: CprHandoverScenario.getTypeName()},
    {id: "cpr-7-restart", typename: CprRestartScenario.getTypeName()},
    {id: "cpr-8-voice", typename: CprVoiceScenario.getTypeName()},
    {id: "cpr-9-pushbar", typename: CprPushBarScenario.getTypeName()},
    {id: "cpr-10-reanalysis", typename: CprReanalysisScenario.getTypeName()},
  ]
}
