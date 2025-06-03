' QCM Assistant Hidden Launcher
' This script launches the QCM Assistant without showing any command window

Option Explicit

Dim shell, fso, currentDir, electronPath, mainJsPath, command

' Get the current directory where this script is located
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Path to the application's main JS file
mainJsPath = currentDir & "\qcm-assistant.js"

' Path to electron executable in node_modules
electronPath = currentDir & "\node_modules\electron\dist\electron.exe"

' Check if electron.exe exists at the expected path
If Not fso.FileExists(electronPath) Then
    ' Try alternate path structure
    electronPath = currentDir & "\node_modules\.bin\electron.cmd"
    
    ' If still not found, show error
    If Not fso.FileExists(electronPath) Then
        WScript.Echo "Error: Could not find Electron executable. Please ensure Electron is installed."
        WScript.Quit
    End If
End If

' Create shell object
Set shell = CreateObject("WScript.Shell")

' Build command - directly using electron executable with the main JS file
command = """" & electronPath & """ """ & mainJsPath & """"

' Run the command with window hidden (0)
shell.Run command, 0, False

' Clean up
Set shell = Nothing
Set fso = Nothing
