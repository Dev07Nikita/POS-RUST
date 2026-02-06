@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the NOTICE file
@REM Brooklyn, New York 11201
@REM ----------------------------------------------------------------------------

@IF "%DEBUG%" == "" @ECHO OFF
@REM set %HOME% to %USERPROFILE% if not set
IF "%HOME%" == "" SET "HOME=%USERPROFILE%"

@REM Execute a command and save its output to a variable.
@REM 1: Name of the variable.
@REM 2: Command to execute.
:EXECUTE_COMMAND
FOR /F "usebackq tokens=*" %%G IN (`%~2`) DO SET "%~1=%%G"
GOTO :EOF

@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM
@REM Required ENV vars:
@REM JAVA_HOME - location of a JDK home dir
@REM
@REM Optional ENV vars
@REM MAVEN_BATCH_ECHO - set to 'on' to enable the echoing of the batch commands
@REM MAVEN_BATCH_PAUSE - set to 'on' to wait for a key stroke before ending
@REM MAVEN_OPTS - parameters passed to the Java VM when running Maven
@REM     e.g. to debug Maven itself, use
@REM set MAVEN_OPTS=-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=8000
@REM ----------------------------------------------------------------------------

@REM Begin all vars with MAVEN_BATCH_PAUSE so they can be cleaned up at the end
SET MAVEN_PROJECTBASEDIR=%~dp0
IF "%MAVEN_PROJECTBASEDIR%" == "" SET MAVEN_PROJECTBASEDIR=%CD%

SET WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar
SET WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties
SET MAVEN_WRAPPER_MAIN=org.apache.maven.wrapper.MavenWrapperMain

@REM Find Java
IF NOT "%JAVA_HOME%" == "" goto :JAVA_HOME_SET
SET "JAVA_EXE=java.exe"
%JAVA_EXE% -version >NUL 2>&1
IF %ERRORLEVEL% EQU 0 goto :RUN_WRAPPER
ECHO.
ECHO Error: JAVA_HOME is set to an invalid directory.
ECHO Please set the JAVA_HOME variable in your environment to match the
ECHO location of your Java installation.
GOTO :ERROR

:JAVA_HOME_SET
SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
IF EXIST "%JAVA_EXE%" goto :RUN_WRAPPER
ECHO.
ECHO Error: JAVA_HOME is set to an invalid directory.
ECHO Please set the JAVA_HOME variable in your environment to match the
ECHO location of your Java installation.
GOTO :ERROR

:RUN_WRAPPER
@REM Download wrapper jar if not exists
IF EXIST "%WRAPPER_JAR%" goto :LAUNCH
ECHO.
ECHO Couldn't find %WRAPPER_JAR%, attempting to download it...
SET "DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar"
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%DOWNLOAD_URL%', '%WRAPPER_JAR%') }"
IF %ERRORLEVEL% EQU 0 goto :LAUNCH
ECHO.
ECHO Error: Failed to download maven-wrapper.jar.
ECHO Please check your internet connection or download it manually from:
ECHO %DOWNLOAD_URL%
ECHO and place it at:
ECHO %WRAPPER_JAR%
GOTO :ERROR

:LAUNCH
"%JAVA_EXE%" %MAVEN_OPTS% %MAVEN_DEBUG_OPTS% -classpath "%WRAPPER_JAR%" %MAVEN_WRAPPER_MAIN% %*
IF %ERRORLEVEL% EQU 0 goto :END

:ERROR
SET ERROR_CODE=%ERRORLEVEL%

:END
@REM pause the batch file if MAVEN_BATCH_PAUSE is set to 'on'
IF "%MAVEN_BATCH_PAUSE%" == "on" pause

IF "%MAVEN_TERMINATE_CMD%" == "on" EXIT %ERROR_CODE%

EXIT /B %ERROR_CODE%
