# Soul Lab Funnel Events (local)

이벤트는 `localStorage: sl_events_v1`에 저장됩니다. `/debug`에서 확인/복사 가능.

## 핵심 퍼널
1) landing_view  
2) cta_start  
3) agreement_view → agreement_submit  
4) loading_start  
5) result_view  
6) ad_show → reward_earned (또는 invite_click_* → chemistry_paired)

## 성장/바이럴
- sharelink_create
- share_open
- share_click_daily
- invite_click_link
- invite_click_contacts
- contacts_open
- chem_invite_copy
- chem_response_make
- chemistry_paired

## 장애
- ad_error

## 추가 (진입/동의)
- cta_needs_agreement
- cta_to_loading
- agreement_continue
- agreement_saved
- agreement_error
- entry_chemistry
