# Mode 1 Balanced Scenario Backlog

## Summary Targets

- Total new scenarios: 25
- zero_expected target: 13
- nonzero_required target: 12

## Candidate Matrix

| Slot | Status | id                                         | expectedPrimary     | expectedResult   | scenario summary                                       | must include anchors       | must exclude anchors            |
| ---- | ------ | ------------------------------------------ | ------------------- | ---------------- | ------------------------------------------------------ | -------------------------- | ------------------------------- |
| 1    | todo   | impaired_stop_breath_demand_positive       | impaired_driving    | nonzero_required | roadside stop with breath demand and detention context | grant, detention, impaired | jordan, trial delay             |
| 2    | todo   | impaired_refusal_charge_positive           | impaired_driving    | nonzero_required | refusal after lawful demand issue                      | lawful demand, refusal     | pure theft markers              |
| 3    | todo   | impaired_minor_ticket_negative             | minor_traffic_stop  | zero_expected    | minor speeding ticket only no detention/search         |                            | grant, hunter, jordan           |
| 4    | todo   | impaired_phone_search_positive             | impaired_driving    | nonzero_required | phone search after impaired stop without warrant       | search, warrant, impaired  | unrelated robbery anchors       |
| 5    | todo   | trafficking_quantity_positive              | drug_trafficking    | nonzero_required | quantity plus packaging and sale intent                | cdsa, trafficking          | simple possession only          |
| 6    | todo   | trafficking_chat_logs_positive             | drug_trafficking    | nonzero_required | messages used for trafficking allegation               | trafficking, intent        | counsel-only anchors            |
| 7    | todo   | simple_possession_not_trafficking_negative | general_criminal    | zero_expected    | possession only no trafficking facts                   |                            | trafficking, s. 5               |
| 8    | todo   | sexual_assault_consent_positive            | sexual_assault      | nonzero_required | consent dispute with allegation details                | consent, sexual assault    | bodily harm only anchors        |
| 9    | todo   | sexual_assault_mistaken_belief_positive    | sexual_assault      | nonzero_required | mistaken belief in communicated consent issue          | mistaken belief, consent   | robbery anchors                 |
| 10   | todo   | assault_bodily_harm_positive               | assault_bodily_harm | nonzero_required | punch causes broken nose and injury evidence           | bodily harm, assault       | sexual assault anchors          |
| 11   | todo   | assault_weapon_positive                    | assault_with_weapon | nonzero_required | threat with knife during altercation                   | weapon, threat             | jordan                          |
| 12   | todo   | bar_fight_self_defence_negative            | assault_bodily_harm | zero_expected    | clear self-defence framing without charge detail       |                            | sexual assault, trafficking     |
| 13   | todo   | detention_no_counsel_positive              | charter_detention   | nonzero_required | arbitrary detention issue without lawyer request facts | detention, s. 9            | 10(b), counsel only             |
| 14   | todo   | counsel_no_detention_positive              | charter_counsel     | nonzero_required | denied lawyer call after arrest questioning            | counsel, 10(b)             | pure search-warrant anchors     |
| 15   | todo   | detention_mislabeled_as_search_negative    | charter_detention   | zero_expected    | brief stop no search no seizure no arrest              |                            | hunter, search, warrant         |
| 16   | todo   | peace_bond_specific_positive               | peace_bond          | nonzero_required | repeated threats and fear application for peace bond   | peace bond, recognizance   | trial delay                     |
| 17   | todo   | landlord_repair_dispute_negative           | general_criminal    | zero_expected    | landlord maintenance dispute civil only                |                            | grant, jordan, hunter           |
| 18   | todo   | workplace_harassment_policy_negative       | general_criminal    | zero_expected    | workplace policy dispute no criminal facts             |                            | robbery, theft, charter         |
| 19   | todo   | online_defamation_civil_negative           | general_criminal    | zero_expected    | online defamation complaint civil framing              |                            | criminal theft/robbery anchors  |
| 20   | todo   | neighbor_tree_damage_civil_negative        | general_criminal    | zero_expected    | property damage dispute between neighbors civil claim  |                            | charter landmarks               |
| 21   | todo   | lost_phone_found_by_other_negative         | general_criminal    | zero_expected    | found-property confusion no force/theft facts          |                            | robbery, s. 343                 |
| 22   | todo   | robbery_force_positive                     | robbery             | nonzero_required | force used to take backpack in alley                   | robbery, force             | jordan                          |
| 23   | todo   | theft_store_conversion_positive            | theft               | nonzero_required | conceal and leave store with unpaid goods              | theft, s. 322              | trial delay                     |
| 24   | todo   | mixed_issue_delay_plus_counsel_positive    | trial_delay         | nonzero_required | prolonged delay plus denied access to counsel          | 11(b), counsel             | unrelated property-only anchors |
| 25   | todo   | ambiguous_low_signal_negative              | general_criminal    | zero_expected    | vague can-i-be-charged question with minimal facts     |                            | landmark-case names             |

## Balance Tracker

- zero_expected planned: 13
- nonzero_required planned: 12

## Review Checklist

- [ ] Each scenario has realistic factual detail (not keyword stuffing)
- [ ] shouldExclude terms are specific enough to catch leakage
- [ ] Positive controls include issue-appropriate anchors
- [ ] No duplicated scenario intent
- [ ] Split remains balanced
