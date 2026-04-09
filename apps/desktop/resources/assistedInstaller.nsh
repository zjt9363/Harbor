!include UAC.nsh

!ifndef INSTALL_MODE_PER_ALL_USERS
  !include multiUserUi.nsh
!endif

!ifndef BUILD_UNINSTALLER

  !ifmacrodef customWelcomePage
    !insertmacro customWelcomePage
  !endif

  !ifmacrodef licensePage
    !insertmacro skipPageIfUpdated
    !insertmacro licensePage
  !endif

  !ifndef INSTALL_MODE_PER_ALL_USERS
    !insertmacro PAGE_INSTALL_MODE
  !endif

  !ifdef allowToChangeInstallationDirectory
    !include "nsDialogs.nsh"
    !include "LogicLib.nsh"
    !include "WinMessages.nsh"

    Var HarborDirectoryPage
    Var HarborDirectoryInput
    Var HarborDirectoryBrowse

    Function HarborNormalizeInstDir
      StrCpy $0 $INSTDIR

trim_trailing_separator:
      StrCmp $0 "" set_default_path
      StrCpy $1 $0 1 -1
      StrCmp $1 "\" trim_one
      StrCmp $1 "/" trim_one
      Goto evaluate_suffix

trim_one:
      StrCpy $0 $0 -1
      Goto trim_trailing_separator

evaluate_suffix:
      StrLen $2 $0
      StrLen $3 "${APP_FILENAME}"
      IntCmp $2 $3 needs_suffix exact_match compare_suffix

compare_suffix:
      StrCpy $4 $0 $3 -$3
      StrCmp $4 "${APP_FILENAME}" 0 needs_suffix
      IntOp $5 $3 + 1
      StrCpy $6 $0 1 -$5
      StrCmp $6 "\" already_ok
      StrCmp $6 "/" already_ok
      Goto needs_suffix

exact_match:
      StrCmp $0 "${APP_FILENAME}" already_ok needs_suffix

set_default_path:
      StrCpy $INSTDIR "$PROGRAMFILES64\${APP_FILENAME}"
      Return

needs_suffix:
      StrCpy $INSTDIR "$0\${APP_FILENAME}"
      Return

already_ok:
      StrCpy $INSTDIR $0
    FunctionEnd

    Function HarborSyncDirTextbox
      ${If} $HarborDirectoryInput != ""
        ${NSD_SetText} $HarborDirectoryInput "$INSTDIR"
      ${EndIf}
    FunctionEnd

    Function HarborDirectoryPageCreate
      !insertmacro MUI_HEADER_TEXT "$(^NameDA)" "选择 Harbor 要安装到的文件夹。"
      Call HarborNormalizeInstDir

      nsDialogs::Create 1018
      Pop $HarborDirectoryPage
      ${If} $HarborDirectoryPage == error
        Abort
      ${EndIf}

      ${NSD_CreateLabel} 0u 0u 300u 24u "Setup 将安装 Harbor 到以下文件夹。若要继续，请点击“安装”；若要选择其他文件夹，请点击“浏览...”。"
      Pop $0

      ${NSD_CreateLabel} 0u 38u 300u 10u "目标文件夹"
      Pop $0

      ${NSD_CreateDirRequest} 0u 52u 220u 12u "$INSTDIR"
      Pop $HarborDirectoryInput

      ${NSD_CreateBrowseButton} 230u 51u 60u 14u "浏览..."
      Pop $HarborDirectoryBrowse
      ${NSD_OnClick} $HarborDirectoryBrowse HarborDirectoryBrowseClick

      Call HarborSyncDirTextbox
      nsDialogs::Show
    FunctionEnd

    Function HarborDirectoryBrowseClick
      nsDialogs::SelectFolderDialog "选择父目录" "$INSTDIR"
      Pop $0
      ${If} $0 != error
        StrCpy $INSTDIR $0
        Call HarborNormalizeInstDir
        Call HarborSyncDirTextbox
      ${EndIf}
    FunctionEnd

    Function HarborDirectoryPageLeave
      ${NSD_GetText} $HarborDirectoryInput $INSTDIR
      Call HarborNormalizeInstDir
    FunctionEnd

    !insertmacro skipPageIfUpdated
    Page custom HarborDirectoryPageCreate HarborDirectoryPageLeave
  !endif

  !ifmacrodef customPageAfterChangeDir
    !insertmacro customPageAfterChangeDir
  !endif

  !insertmacro MUI_PAGE_INSTFILES
  !ifmacrodef customFinishPage
    !insertmacro customFinishPage
  !else
    !ifndef HIDE_RUN_AFTER_FINISH
      Function StartApp
        ${if} ${isUpdated}
          StrCpy $1 "--updated"
        ${else}
          StrCpy $1 ""
        ${endif}
        HideWindow
        ${StdUtils.ExecShellAsUser} $0 "$appExe" "open" "$1"
      FunctionEnd

      !define MUI_FINISHPAGE_RUN
      !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
    !endif
    !insertmacro MUI_PAGE_FINISH
  !endif
!else
  !ifndef removeDefaultUninstallWelcomePage
    !ifmacrodef customUnWelcomePage
      !insertmacro customUnWelcomePage
    !else
      !insertmacro MUI_UNPAGE_WELCOME
  !endif

  !endif
  !ifndef INSTALL_MODE_PER_ALL_USERS
    !insertmacro PAGE_INSTALL_MODE
  !endif
  !insertmacro MUI_UNPAGE_INSTFILES
  !ifmacrodef customUninstallPage
    !insertmacro customUninstallPage
  !endif
  !insertmacro MUI_UNPAGE_FINISH
!endif

!macro initMultiUser
  !ifdef INSTALL_MODE_PER_ALL_USERS
    !insertmacro setInstallModePerAllUsers
  !else
    ${If} ${UAC_IsInnerInstance}
    ${AndIfNot} ${UAC_IsAdmin}
      SetErrorLevel 0x666666
      Quit
    ${endIf}

    !ifndef MULTIUSER_INIT_TEXT_ADMINREQUIRED
      !define MULTIUSER_INIT_TEXT_ADMINREQUIRED "$(^Caption) requires administrator privileges."
    !endif

    !ifndef MULTIUSER_INIT_TEXT_POWERREQUIRED
      !define MULTIUSER_INIT_TEXT_POWERREQUIRED "$(^Caption) requires at least Power User privileges."
    !endif

    !ifndef MULTIUSER_INIT_TEXT_ALLUSERSNOTPOSSIBLE
      !define MULTIUSER_INIT_TEXT_ALLUSERSNOTPOSSIBLE "Your user account does not have sufficient privileges to install $(^Name) for all users of this computer."
    !endif

    # checks registry for previous installation path (both for upgrading, reinstall, or uninstall)
    StrCpy $hasPerMachineInstallation "0"
    StrCpy $hasPerUserInstallation "0"

    # set installation mode to setting from a previous installation
    ReadRegStr $perMachineInstallationFolder HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${if} $perMachineInstallationFolder != ""
      StrCpy $hasPerMachineInstallation "1"
    ${endif}

    ReadRegStr $perUserInstallationFolder HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${if} $perUserInstallationFolder != ""
      StrCpy $hasPerUserInstallation "1"
    ${endif}

    ${GetParameters} $R0
    ${GetOptions} $R0 "/allusers" $R1
    ${IfNot} ${Errors}
      StrCpy $hasPerMachineInstallation "1"
      StrCpy $hasPerUserInstallation "0"
    ${EndIf}

    ${GetOptions} $R0 "/currentuser" $R1
    ${IfNot} ${Errors}
      StrCpy $hasPerMachineInstallation "0"
      StrCpy $hasPerUserInstallation "1"
    ${EndIf}

    ${if} $hasPerUserInstallation == "1"
    ${andif} $hasPerMachineInstallation == "0"
      !insertmacro setInstallModePerUser
    ${elseif} $hasPerUserInstallation == "0"
      ${andif} $hasPerMachineInstallation == "1"
      !insertmacro setInstallModePerAllUsers
    ${else}
      # if there is no installation, or there is both per-user and per-machine
      !ifdef INSTALL_MODE_PER_ALL_USERS
        !insertmacro setInstallModePerAllUsers
      !else
        !ifdef INSTALL_MODE_PER_ALL_USERS_DEFAULT
          !insertmacro setInstallModePerAllUsers
        !else
          !insertmacro setInstallModePerUser
        !endif
      !endif
    ${endif}
  !endif
!macroend
