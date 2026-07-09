param(
    [int]$TimeoutSeconds = 20
)

$ErrorActionPreference = "Stop"

function Write-Result {
    param([hashtable]$Result)
    $Result | ConvertTo-Json -Compress
}

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    try {
        Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class DpiHelper {
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
}
"@
        [DpiHelper]::SetProcessDPIAware() | Out-Null
    } catch {
    }

    $script:completed = $false
    $script:result = $null

    function Complete-Pick {
        param([hashtable]$Result)
        if ($script:completed) {
            return
        }
        $script:completed = $true
        $script:result = $Result
        if ($script:timer) {
            $script:timer.Stop()
            $script:timer.Dispose()
        }
        if ($script:form) {
            $script:form.Close()
        }
    }

    function Read-ScreenPixelHex {
        param([System.Drawing.Point]$Point)

        $bitmap = New-Object System.Drawing.Bitmap 1, 1
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.CopyFromScreen($Point, [System.Drawing.Point]::Empty, (New-Object System.Drawing.Size 1, 1))
            $color = $bitmap.GetPixel(0, 0)
            return ("#{0:X2}{1:X2}{2:X2}" -f $color.R, $color.G, $color.B)
        } finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }

    $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $script:form = New-Object System.Windows.Forms.Form
    $script:form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
    $script:form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $script:form.ShowInTaskbar = $false
    $script:form.TopMost = $true
    $script:form.KeyPreview = $true
    $script:form.Bounds = $bounds
    $script:form.BackColor = [System.Drawing.Color]::Black
    $script:form.Opacity = 0.01
    $script:form.Cursor = [System.Windows.Forms.Cursors]::Cross

    $script:form.Add_KeyDown({
        if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
            Complete-Pick @{ ok = $false; canceled = $true }
        }
    })

    $script:form.Add_MouseDown({
        try {
            $point = [System.Windows.Forms.Cursor]::Position
            $script:form.Hide()
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 80
            $hex = Read-ScreenPixelHex -Point $point
            Complete-Pick @{ ok = $true; hex = $hex }
        } catch {
            Complete-Pick @{
                ok = $false
                failed = $true
                errorCode = "PICK_FAILED"
                message = $_.Exception.Message
            }
        }
    })

    $script:timer = New-Object System.Windows.Forms.Timer
    $script:timer.Interval = [Math]::Max(1, $TimeoutSeconds) * 1000
    $script:timer.Add_Tick({
        Complete-Pick @{
            ok = $false
            failed = $true
            errorCode = "TIMEOUT"
            message = "Eyedropper timed out."
        }
    })
    $script:timer.Start()

    [System.Windows.Forms.Application]::Run($script:form)

    if (-not $script:result) {
        $script:result = @{ ok = $false; canceled = $true }
    }
    Write-Result $script:result
    exit 0
} catch {
    Write-Result @{
        ok = $false
        failed = $true
        errorCode = "HELPER_ERROR"
        message = $_.Exception.Message
    }
    exit 1
}
