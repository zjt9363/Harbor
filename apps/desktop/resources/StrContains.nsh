; Custom override for electron-builder's assisted installer directory sanitizer.
; We only consider the install path "already containing" the app name if the
; final path segment exactly matches it, so choosing a parent folder like
; "E:\Harbor\release" still installs to "E:\Harbor\release\Harbor".

Var STR_HAYSTACK
Var STR_NEEDLE
Var STR_RETURN_VAR
Var STR_LAST_CHAR
Var STR_NEEDLE_LENGTH

Function StrContains
  Exch $STR_NEEDLE
  Exch 1
  Exch $STR_HAYSTACK

  StrCpy $STR_RETURN_VAR ""
  StrLen $STR_NEEDLE_LENGTH $STR_NEEDLE

trim_trailing_separator:
  StrCmp $STR_HAYSTACK "" compare_segments
  StrCpy $STR_LAST_CHAR $STR_HAYSTACK 1 -1
  StrCmp $STR_LAST_CHAR "\" trim_one
  StrCmp $STR_LAST_CHAR "/" trim_one
  Goto compare_segments

trim_one:
  StrCpy $STR_HAYSTACK $STR_HAYSTACK -1
  Goto trim_trailing_separator

compare_segments:
  StrCmp $STR_HAYSTACK "" done
  StrLen $2 $STR_HAYSTACK
  IntCmp $2 $STR_NEEDLE_LENGTH done exact_match check_suffix

check_suffix:
  StrCpy $1 $STR_HAYSTACK $STR_NEEDLE_LENGTH -$STR_NEEDLE_LENGTH
  StrCmp $1 $STR_NEEDLE 0 done
  IntOp $0 $STR_NEEDLE_LENGTH + 1
  StrCpy $1 $STR_HAYSTACK 1 -$0
  StrCmp $1 "\" matched_segment
  StrCmp $1 "/" matched_segment
  Goto done

exact_match:
  StrCmp $STR_HAYSTACK $STR_NEEDLE matched_segment done

matched_segment:
  StrCpy $STR_RETURN_VAR $STR_NEEDLE

done:
  Pop $STR_NEEDLE
  Exch $STR_RETURN_VAR
FunctionEnd

!macro _StrContainsConstructor OUT NEEDLE HAYSTACK
  Push `${HAYSTACK}`
  Push `${NEEDLE}`
  Call StrContains
  Pop `${OUT}`
!macroend

!define StrContains '!insertmacro "_StrContainsConstructor"'
