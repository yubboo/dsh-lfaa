$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$sourceManifestPath = Join-Path $projectRoot 'packages\dsh-lfaa\package.json'
$distDirectory = Join-Path $projectRoot 'dist\packages\dsh-lfaa'
$registry = 'https://registry.npmjs.org/'
$expectedRemote = 'https://github.com/yubboo/dsh-lfaa'

try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
}
catch {
    # Keep the menu usable in hosts that do not allow console encoding changes.
}

Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath $sourceManifestPath -PathType Leaf)) {
    throw "找不到插件清单：$sourceManifestPath"
}
$packageManifest = Get-Content -LiteralPath $sourceManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$packageName = [string]$packageManifest.name
$packageVersion = [string]$packageManifest.version
if ($packageName -ne 'dsh-lfaa' -or $packageVersion -notmatch '^\d+\.\d+\.\d+$') {
    throw '插件名称或版本格式不符合发布要求。'
}

function Show-MainMenu {
    Clear-Host
    Write-Host ''
    Write-Host '==================================================' -ForegroundColor DarkCyan
    Write-Host '           dsh-lfaa 发布与推送工作台' -ForegroundColor Cyan
    Write-Host '==================================================' -ForegroundColor DarkCyan
    Write-Host "仓库：$projectRoot" -ForegroundColor DarkGray
    Write-Host "npm 包：$packageName@$packageVersion" -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  【1】仅构建 npm 发行包' -ForegroundColor Green
    Write-Host '  【2】构建并预览 npm 发行清单' -ForegroundColor Green
    Write-Host '  【3】检查 npm 官方源登录状态' -ForegroundColor Yellow
    Write-Host '  【4】查询 npm 版本与 dist-tags' -ForegroundColor Yellow
    Write-Host '  【5】打开 npm 包页面' -ForegroundColor Yellow
    Write-Host '  【6】一键正常推送 GitHub main（不覆盖远端历史）' -ForegroundColor Green
    Write-Host '  【7】一键发布 npm（检查、构建、预览、确认发布）' -ForegroundColor Magenta
    Write-Host '  【0】退出' -ForegroundColor Red
    Write-Host ''
}

function Get-ToolPath {
    param([Parameter(Mandatory = $true)][string]$Name)
    $tool = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $tool) {
        throw "未检测到 $Name，请先安装并确认它已加入 PATH。"
    }
    return $tool.Source
}

function Invoke-ExternalCapture {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [int[]]$AllowedExitCodes = @(0)
    )

    $output = @(& $Executable @Arguments 2>&1 | ForEach-Object { [string]$_ })
    $exitCode = $LASTEXITCODE
    if ($AllowedExitCodes -notcontains $exitCode) {
        $details = ($output -join [Environment]::NewLine).Trim()
        if ([string]::IsNullOrWhiteSpace($details)) { $details = 'no command output' }
        throw "$Executable failed with exit code $exitCode.`n$details"
    }
    return [PSCustomObject]@{ ExitCode = $exitCode; Output = $output }
}

function Invoke-ExternalChecked {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Executable exited with code $LASTEXITCODE."
    }
}

function Get-GitResult {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [int[]]$AllowedExitCodes = @(0)
    )

    $gitPath = Get-ToolPath 'git.exe'
    $gitArguments = @('-c', 'core.quotePath=false', '-C', $projectRoot) + $Arguments
    return Invoke-ExternalCapture -Executable $gitPath -Arguments $gitArguments -AllowedExitCodes $AllowedExitCodes
}

function Invoke-GitChecked {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $gitPath = Get-ToolPath 'git.exe'
    $gitArguments = @('-c', 'core.quotePath=false', '-C', $projectRoot) + $Arguments
    Invoke-ExternalChecked -Executable $gitPath -Arguments $gitArguments
}

function Get-GitLines {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    $result = Get-GitResult -Arguments $Arguments
    return @($result.Output)
}

function Read-Confirmation {
    param([Parameter(Mandatory = $true)][string]$Prompt)
    while ($true) {
        $answer = (Read-Host "$Prompt (y/N)").Trim()
        if ([string]::IsNullOrWhiteSpace($answer) -or $answer -imatch '^(n|no|否)$') { return $false }
        if ($answer -imatch '^(y|yes|是)$') { return $true }
        Write-Host '请输入 y 或 n。' -ForegroundColor Yellow
    }
}

function Pause-AfterAction {
    if (-not [Console]::IsInputRedirected) {
        [void](Read-Host '按 Enter 返回菜单')
    }
}

function Build-ReleasePackage {
    $pnpmPath = Get-ToolPath 'pnpm.cmd'
    Write-Host '正在构建插件发行包……' -ForegroundColor Cyan
    Invoke-ExternalChecked -Executable $pnpmPath -Arguments @('run', 'build')

    $requiredFiles = @('package.json', 'index.mjs', 'client.js', 'cordis.patch.yml', 'README.md', 'README.zh.md')
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $distDirectory $file) -PathType Leaf)) {
            throw "发行目录缺少必需文件：$file"
        }
    }

    $builtManifestPath = Join-Path $distDirectory 'package.json'
    $builtManifest = Get-Content -LiteralPath $builtManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($builtManifest.name -ne $packageName -or $builtManifest.version -ne $packageVersion -or $builtManifest.private) {
        throw '发行清单名称、版本或 public 状态不匹配。'
    }
    Write-Host "构建完成：$distDirectory" -ForegroundColor Green
}

function Preview-ReleasePackage {
    if (-not (Test-Path -LiteralPath (Join-Path $distDirectory 'package.json') -PathType Leaf)) {
        throw '找不到发行包，请先选择菜单 1 或 2。'
    }
    $npmPath = Get-ToolPath 'npm.cmd'
    Write-Host 'npm pack 清单预览：' -ForegroundColor Cyan
    Push-Location -LiteralPath $distDirectory
    try {
        Invoke-ExternalChecked -Executable $npmPath -Arguments @('pack', '--dry-run', '--json', "--registry=$registry")
    }
    finally {
        Pop-Location
    }
}

function Check-NpmLogin {
    $npmPath = Get-ToolPath 'npm.cmd'
    Write-Host '正在检查 npm 官方源登录状态……' -ForegroundColor Cyan
    Invoke-ExternalChecked -Executable $npmPath -Arguments @('whoami', "--registry=$registry")
    Write-Host 'npm 登录状态正常。' -ForegroundColor Green
}

function Query-NpmRegistry {
    $npmPath = Get-ToolPath 'npm.cmd'
    Write-Host 'npm 官方源版本与 dist-tags：' -ForegroundColor Cyan
    Invoke-ExternalChecked -Executable $npmPath -Arguments @('view', $packageName, 'version', 'dist-tags', '--json', "--registry=$registry")
    Write-Host "当前源码版本 $packageName@$packageVersion：" -ForegroundColor Cyan
    $result = Invoke-ExternalCapture -Executable $npmPath -Arguments @('view', "$packageName@$packageVersion", 'version', '--json', "--registry=$registry") -AllowedExitCodes @(0, 1)
    if ($result.Output.Count -gt 0) { $result.Output | ForEach-Object { Write-Host $_ } }
    if ($result.ExitCode -ne 0) { Write-Host '该版本尚未出现在官方源，或当前无法查询。' -ForegroundColor Yellow }
}

function Publish-NpmPackage {
    $npmPath = Get-ToolPath 'npm.cmd'
    $pnpmPath = Get-ToolPath 'pnpm.cmd'
    Write-Host "目标：$packageName@$packageVersion → $registry" -ForegroundColor Cyan
    if (-not (Read-Confirmation '开始检查、构建并准备发布？')) {
        Write-Host '已取消 npm 发布。' -ForegroundColor DarkGray
        return
    }

    Check-NpmLogin
    $versionResult = Invoke-ExternalCapture -Executable $npmPath -Arguments @('view', "$packageName@$packageVersion", 'version', '--json', "--registry=$registry") -AllowedExitCodes @(0, 1)
    if ($versionResult.ExitCode -eq 0) {
        throw "$packageName@$packageVersion 已存在于 npm 官方源；请先更新 packages\dsh-lfaa\package.json 的版本。"
    }
    if (($versionResult.Output -join "`n") -notmatch '\bE404\b') {
        throw "无法确认该版本是否已发布，已停止：$($versionResult.Output -join ' ')"
    }
    Write-Host '当前版本尚未出现在 npm 官方源。' -ForegroundColor Green

    Build-ReleasePackage
    Preview-ReleasePackage
    if (-not (Read-Confirmation "清单检查通过，确认发布 $packageName@$packageVersion？")) {
        Write-Host '已取消发布；构建产物保留在 dist\packages\dsh-lfaa。' -ForegroundColor DarkGray
        return
    }

    Write-Host '正在发布到 npm 官方源……' -ForegroundColor Cyan
    Push-Location -LiteralPath $distDirectory
    try {
        Invoke-ExternalChecked -Executable $npmPath -Arguments @('publish', "--registry=$registry")
    }
    finally {
        Pop-Location
    }

    Write-Host '正在核对官方源版本和 dist-tags……' -ForegroundColor Cyan
    Invoke-ExternalChecked -Executable $npmPath -Arguments @('view', "$packageName@$packageVersion", 'version', '--json', "--registry=$registry")
    Invoke-ExternalChecked -Executable $npmPath -Arguments @('view', $packageName, 'dist-tags', '--json', "--registry=$registry")
    Write-Host "请确认 latest 指向 $packageVersion。" -ForegroundColor Green
}

function Normalize-GitRemote {
    param([Parameter(Mandatory = $true)][string]$Url)
    $normalized = $Url.Trim() -replace '^git@github\.com:', 'https://github.com/'
    $normalized = $normalized -replace '^ssh://git@github\.com/', 'https://github.com/'
    $normalized = $normalized -replace '\.git$', ''
    return $normalized.TrimEnd('/').ToLowerInvariant()
}

function Get-CommitMessageVersion {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$CommitMessage)
    if ($CommitMessage -match '^\s*(?:DSH-LFAA\s+)?v?(?<version>\d+\.\d+\.\d+)(?=$|[\s:：-])') {
        return $Matches['version']
    }
    return ''
}

function Test-PushVersionIsNewer {
    param(
        [Parameter(Mandatory = $true)][string]$Candidate,
        [Parameter(Mandatory = $true)][string]$Previous
    )
    return ([version]$Candidate).CompareTo([version]$Previous) -gt 0
}

function Resolve-LastPushedVersion {
    param(
        [string[]]$RemoteCommitSubjects = @(),
        [string]$LocalVersion = ''
    )

    foreach ($subject in $RemoteCommitSubjects) {
        $version = Get-CommitMessageVersion -CommitMessage $subject
        if (-not [string]::IsNullOrWhiteSpace($version)) {
            return [PSCustomObject]@{ Number = $version; Source = 'GitHub main 最近的版本提交' }
        }
    }
    if ($LocalVersion -match '^\d+\.\d+\.\d+$') {
        return [PSCustomObject]@{ Number = $LocalVersion; Source = '本机最近一次成功推送记录' }
    }
    return [PSCustomObject]@{ Number = ''; Source = '尚无可识别的推送版本记录' }
}

function Get-LastPushedVersion {
    param([Parameter(Mandatory = $true)][bool]$RemoteMainExists)

    $remoteSubjects = @()
    if ($RemoteMainExists) {
        $remoteSubjects = @(Get-GitLines -Arguments @('log', '--format=%s', 'FETCH_HEAD'))
    }
    $localResult = Get-GitResult -Arguments @('config', '--local', '--get', 'dsh-lfaa.lastPushedVersion') -AllowedExitCodes @(0, 1)
    $localVersion = if ($localResult.ExitCode -eq 0 -and $localResult.Output.Count -gt 0) { ([string]$localResult.Output[0]).Trim() } else { '' }
    return Resolve-LastPushedVersion -RemoteCommitSubjects $remoteSubjects -LocalVersion $localVersion
}

function Get-LastPendingLocalVersion {
    param([Parameter(Mandatory = $true)][bool]$RemoteMainExists)

    $subjects = if ($RemoteMainExists) {
        @(Get-GitLines -Arguments @('log', '--format=%s', 'FETCH_HEAD..HEAD'))
    }
    else {
        @(Get-GitLines -Arguments @('log', '--format=%s', 'HEAD'))
    }
    foreach ($subject in $subjects) {
        $version = Get-CommitMessageVersion -CommitMessage $subject
        if (-not [string]::IsNullOrWhiteSpace($version)) {
            return [PSCustomObject]@{ Number = $version; Source = '本地尚未推送的最近版本提交' }
        }
    }
    return [PSCustomObject]@{ Number = ''; Source = '没有待推送版本提交' }
}

function Read-VersionedCommitMessage {
    param([string]$PreviousVersion = '')

    while ($true) {
        $message = (Read-Host '请输入本次提交说明（版本号开头，例如 0.0.2 修复问题）').Trim()
        if ([string]::IsNullOrWhiteSpace($message)) {
            Write-Host '提交说明不能为空。' -ForegroundColor Yellow
            continue
        }
        $candidateVersion = Get-CommitMessageVersion -CommitMessage $message
        if ([string]::IsNullOrWhiteSpace($candidateVersion)) {
            Write-Host '提交说明必须以三段版本号开头，例如 0.0.2 或 0.0.2 修复问题。' -ForegroundColor Yellow
            continue
        }
        if (-not [string]::IsNullOrWhiteSpace($PreviousVersion) -and -not (Test-PushVersionIsNewer -Candidate $candidateVersion -Previous $PreviousVersion)) {
            Write-Host "版本号必须高于上一次版本 $PreviousVersion；当前输入为 $candidateVersion。" -ForegroundColor Yellow
            continue
        }
        return [PSCustomObject]@{ Message = $message; Version = $candidateVersion }
    }
}

function Assert-GitHubTarget {
    $gitPath = Get-ToolPath 'git.exe'
    $rootResult = Get-GitResult -Arguments @('rev-parse', '--show-toplevel')
    $gitRoot = ([string]$rootResult.Output[0]).Trim()
    if ([System.IO.Path]::GetFullPath($gitRoot) -ne [System.IO.Path]::GetFullPath($projectRoot)) {
        throw "Git 根目录不是当前插件仓库：$gitRoot"
    }

    $branchResult = Get-GitResult -Arguments @('branch', '--show-current')
    $branch = ([string]$branchResult.Output[0]).Trim()
    if ($branch -ne 'main') {
        throw "当前分支是 '$branch'；此菜单只推送 main。请先切换到 main。"
    }

    $fetchUrls = @(Get-GitLines -Arguments @('remote', 'get-url', '--all', 'origin'))
    $pushUrls = @(Get-GitLines -Arguments @('remote', 'get-url', '--push', '--all', 'origin'))
    if ($fetchUrls.Count -ne 1 -or (Normalize-GitRemote $fetchUrls[0]) -ne $expectedRemote) {
        throw "origin fetch 地址不是 $expectedRemote.git；为避免推错仓库，已停止。"
    }
    if ($pushUrls.Count -ne 1 -or (Normalize-GitRemote $pushUrls[0]) -ne $expectedRemote) {
        throw "origin push 地址不是 $expectedRemote.git；为避免推错仓库，已停止。"
    }
    Write-Host "已核对 GitHub 目标：$expectedRemote.git（main）" -ForegroundColor Green

    $remoteHeads = Get-GitResult -Arguments @('ls-remote', '--heads', 'origin')
    $mainExists = @($remoteHeads.Output | Where-Object { $_ -match '\srefs/heads/main$' }).Count -gt 0
    $otherHeads = @($remoteHeads.Output | Where-Object { $_ -match '\srefs/heads/' -and $_ -notmatch '\srefs/heads/main$' })
    if ($mainExists) {
        Invoke-GitChecked -Arguments @('fetch', '--quiet', '--no-tags', 'origin', 'refs/heads/main')
        $relation = Get-GitResult -Arguments @('rev-list', '--left-right', '--count', 'HEAD...FETCH_HEAD')
        $counts = ([string]$relation.Output[0]).Trim() -split '\s+'
        if ($counts.Count -ne 2) { throw '无法核对本地与 GitHub main 的提交关系。' }
        if ([int]$counts[1] -gt 0) {
            throw 'GitHub main 含有本地没有的提交；为保留远端历史，本次没有创建提交或推送。请先单独同步后重试。'
        }
    }
    elseif ($otherHeads.Count -gt 0) {
        throw 'GitHub 仓库存在其他分支但没有 main；为避免新建错误目标分支，已停止。'
    }
    return $mainExists
}

function Assert-StagedChangesSafe {
    $stagedPaths = @(Get-GitLines -Arguments @('diff', '--cached', '--name-only'))
    if ($stagedPaths.Count -eq 0) { return $stagedPaths }

    $blockedPattern = '(^|/)(node_modules|dist|data)(/|$)|(^|/)\.env(?:\.[^/]*)?$|\.log$'
    $blockedPaths = @($stagedPaths | Where-Object { $_ -match $blockedPattern -and $_ -notmatch '(^|/)\.env\.example$' })
    if ($blockedPaths.Count -gt 0) {
        throw "暂存区包含运行数据、构建产物或环境文件，已阻止提交：`n$($blockedPaths -join "`n")"
    }

    $indexEntries = Get-GitLines -Arguments @('ls-files', '--stage')
    $largePaths = New-Object System.Collections.Generic.List[string]
    foreach ($entry in $indexEntries) {
        if ($entry -match '^[0-7]+ ([0-9a-f]+) 0\t(.+)$') {
            $objectId = $Matches[1]
            $path = $Matches[2]
            if ($stagedPaths -contains $path) {
                $sizeResult = Get-GitResult -Arguments @('cat-file', '-s', $objectId)
                $sizeBytes = [long]([string]$sizeResult.Output[0]).Trim()
                if ($sizeBytes -gt 25MB) {
                    $largePaths.Add(("{0} ({1} MiB)" -f $path, [math]::Round(($sizeBytes / 1MB), 1)))
                }
            }
        }
    }
    if ($largePaths.Count -gt 0) {
        throw "暂存区含有超过 25 MiB 的文件，已阻止提交：`n$($largePaths -join "`n")"
    }

    $secretPatterns = @(
        '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
        'AKIA[0-9A-Z]{16}',
        'github_pat_[A-Za-z0-9_]{22,}|gh[pousr]_[A-Za-z0-9_]{20,}',
        'sk-[A-Za-z0-9_-]{32,}'
    )
    foreach ($pattern in $secretPatterns) {
        $scan = Get-GitResult -Arguments @('grep', '--cached', '-I', '-l', '-E', '-e', $pattern, '--') -AllowedExitCodes @(0, 1)
        if ($scan.ExitCode -eq 0) {
            throw "暂存文件疑似包含高风险凭据（仅列出文件名）：`n$($scan.Output -join "`n")"
        }
    }
    return $stagedPaths
}

function Push-GitHubRepository {
    $gitPath = Get-ToolPath 'git.exe'
    Write-Host ''
    Write-Host '【GitHub 正常推送】' -ForegroundColor Green
    Write-Host '脚本只执行普通 git push；不会强推或覆盖远端历史。' -ForegroundColor Green

    $mainExists = Assert-GitHubTarget
    $lastPushedVersion = Get-LastPushedVersion -RemoteMainExists $mainExists
    $pendingLocalVersion = Get-LastPendingLocalVersion -RemoteMainExists $mainExists
    if ([string]::IsNullOrWhiteSpace($lastPushedVersion.Number)) {
        Write-Host "上一次已推送版本：未记录（$($lastPushedVersion.Source)）；本次需要填写初始版本。" -ForegroundColor Yellow
    }
    else {
        Write-Host "上一次已推送版本：$($lastPushedVersion.Number)（来源：$($lastPushedVersion.Source)）。" -ForegroundColor Magenta
    }
    if (-not [string]::IsNullOrWhiteSpace($pendingLocalVersion.Number)) {
        Write-Host "本地待推送版本：$($pendingLocalVersion.Number)（来源：$($pendingLocalVersion.Source)）。" -ForegroundColor Magenta
    }

    $previousVersion = $lastPushedVersion.Number
    if (-not [string]::IsNullOrWhiteSpace($pendingLocalVersion.Number)) {
        if (-not [string]::IsNullOrWhiteSpace($lastPushedVersion.Number) -and -not (Test-PushVersionIsNewer -Candidate $pendingLocalVersion.Number -Previous $lastPushedVersion.Number)) {
            throw "本地待推送版本 $($pendingLocalVersion.Number) 不高于 GitHub 上次版本 $($lastPushedVersion.Number)，已停止推送。"
        }
        $previousVersion = $pendingLocalVersion.Number
    }

    $workingChanges = @(Get-GitLines -Arguments @('status', '--short', '--untracked-files=all'))
    if ($workingChanges.Count -gt 0) {
        Write-Host '当前工作区变化：' -ForegroundColor Cyan
        $workingChanges | ForEach-Object { Write-Host "  $_" }
    }
    else {
        Write-Host '工作区干净。' -ForegroundColor DarkGray
    }

    $commitMessage = ''
    $commitVersion = ''
    if ($workingChanges.Count -gt 0) {
        $versionedMessage = Read-VersionedCommitMessage -PreviousVersion $previousVersion
        $commitMessage = $versionedMessage.Message
        $commitVersion = $versionedMessage.Version
    }
    if (-not (Read-Confirmation '确认暂存当前仓库变更并推送到 GitHub main？')) {
        Write-Host '已取消 GitHub 推送。' -ForegroundColor DarkGray
        return
    }

    if ($workingChanges.Count -gt 0) {
        Invoke-GitChecked -Arguments @('add', '-A')
        $stagedPaths = @(Assert-StagedChangesSafe)
        if ($stagedPaths.Count -gt 0) {
            Write-Host '本次暂存文件：' -ForegroundColor Cyan
            (Get-GitLines -Arguments @('diff', '--cached', '--name-status', '--find-renames')) | ForEach-Object { Write-Host "  $_" }
            Write-Host '已检查：排除运行数据/构建产物/环境文件，并扫描高风险凭据与大文件。' -ForegroundColor Green
            Invoke-GitChecked -Arguments @('commit', '-m', $commitMessage)
        }
        else {
            Write-Host '忽略规则过滤后没有可提交文件。' -ForegroundColor Yellow
        }
    }

    $aheadCount = 0
    if ($mainExists) {
        $aheadResult = Get-GitResult -Arguments @('rev-list', '--count', 'FETCH_HEAD..HEAD')
        $aheadCount = [int]([string]$aheadResult.Output[0]).Trim()
    }
    else {
        $aheadCount = [int]((Get-GitLines -Arguments @('rev-list', '--count', 'HEAD'))[0])
    }
    if ($aheadCount -eq 0) {
        Write-Host '没有待推送提交；GitHub main 已与本地一致。' -ForegroundColor Yellow
        return
    }

    if ([string]::IsNullOrWhiteSpace($commitVersion)) {
        $headSubject = [string](Get-GitLines -Arguments @('log', '-1', '--format=%s', 'HEAD'))[0]
        $commitVersion = Get-CommitMessageVersion -CommitMessage $headSubject
        if ([string]::IsNullOrWhiteSpace($commitVersion)) {
            throw '待推送的最新提交说明没有以三段版本号开头；已停止推送。'
        }
        if (-not [string]::IsNullOrWhiteSpace($lastPushedVersion.Number) -and -not (Test-PushVersionIsNewer -Candidate $commitVersion -Previous $lastPushedVersion.Number)) {
            throw "待推送版本 $commitVersion 不高于 GitHub 上次版本 $($lastPushedVersion.Number)；已停止推送。"
        }
    }

    Write-Host '正在执行安全推送：git push origin HEAD:refs/heads/main' -ForegroundColor Cyan
    Invoke-GitChecked -Arguments @('-c', 'http.lowSpeedLimit=1024', '-c', 'http.lowSpeedTime=60', 'push', 'origin', 'HEAD:refs/heads/main')
    try {
        Invoke-GitChecked -Arguments @('config', '--local', 'dsh-lfaa.lastPushedVersion', $commitVersion)
    }
    catch {
        Write-Host "推送已成功，但无法写入本机版本缓存；下次会从 GitHub 历史读取。原因：$($_.Exception.Message)" -ForegroundColor Yellow
    }
    Write-Host "GitHub main 推送成功（$aheadCount 个本地提交）。" -ForegroundColor Green
}

function Open-NpmPackagePage {
    Start-Process "https://www.npmjs.com/package/$packageName"
    Write-Host '已打开 npm 包页面。' -ForegroundColor Green
}

while ($true) {
    Show-MainMenu
    if ([Console]::IsInputRedirected) {
        $choice = [Console]::ReadLine()
        if ([string]::IsNullOrWhiteSpace($choice)) { break }
    }
    else {
        $choice = Read-Host '请输入编号'
    }

    try {
        switch ($choice.Trim()) {
            '0' { Write-Host '已退出。' -ForegroundColor DarkGray; exit 0 }
            '1' { Build-ReleasePackage }
            '2' { Build-ReleasePackage; Preview-ReleasePackage }
            '3' { Check-NpmLogin }
            '4' { Query-NpmRegistry }
            '5' { Open-NpmPackagePage }
            '6' { Push-GitHubRepository }
            '7' { Publish-NpmPackage }
            default { Write-Host '无效编号，请选择 0 至 7。' -ForegroundColor Yellow }
        }
    }
    catch {
        Write-Host "操作失败：$($_.Exception.Message)" -ForegroundColor Red
    }

    Pause-AfterAction
}
