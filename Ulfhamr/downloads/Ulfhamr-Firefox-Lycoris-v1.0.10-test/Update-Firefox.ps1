$ErrorActionPreference='Stop'
try {
 $target=[IO.Path]::GetFullPath($env:ULF_UPDATE_DIR)
 $zip=$env:ULF_UPDATE_ZIP
 if(-not $zip){$zip=Read-Host 'Drop the downloaded ZIP here, then press Enter'}
 $zip=$zip.Trim('"')
 if(-not(Test-Path -LiteralPath $zip -PathType Leaf)){throw 'ZIP file not found'}
 $current=Get-Content -LiteralPath (Join-Path $target 'manifest.json') -Raw | ConvertFrom-Json
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $archive=[IO.Compression.ZipFile]::OpenRead($zip)
 try {
  $entry=$archive.GetEntry('manifest.json');if(-not $entry){throw 'manifest.json missing at ZIP root'}
  $reader=New-Object IO.StreamReader($entry.Open());try{$next=$reader.ReadToEnd()|ConvertFrom-Json}finally{$reader.Dispose()}
  if($next.browser_specific_settings.gecko.id -ne $current.browser_specific_settings.gecko.id){throw 'Wrong extension ID'}
  if([version]$next.version -lt [version]$current.version){throw 'Older version: update cancelled'}
  foreach($item in $archive.Entries){
   $dest=[IO.Path]::GetFullPath((Join-Path $target $item.FullName))
   if(-not $dest.StartsWith($target.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe ZIP path'}
  }
 } finally {$archive.Dispose()}
 $stage=Join-Path ([IO.Path]::GetTempPath()) ('Ulfhamr-'+[guid]::NewGuid())
 [IO.Compression.ZipFile]::ExtractToDirectory($zip,$stage)
 foreach($name in @('index.html','background.js','app.js')){if(-not(Test-Path -LiteralPath (Join-Path $stage $name))){throw ('Missing file: '+$name)}}
 $backup=Join-Path (Split-Path $target -Parent) ('Ulfhamr-Backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')+'.zip')
 [IO.Compression.ZipFile]::CreateFromDirectory($target,$backup)
 Get-ChildItem -LiteralPath $stage -Force | Copy-Item -Destination $target -Recurse -Force
 Write-Host ('Updated to '+$next.version)
 Write-Host ('Backup: '+$backup)
 Write-Host 'Firefox: about:debugging#/runtime/this-firefox -> Reload Ulfhamr.'
 Write-Host 'Then reload the Lycoris tab. Do not remove the add-on.'
} catch {Write-Host ('UPDATE FAILED: '+$_.Exception.Message);exit 1}
