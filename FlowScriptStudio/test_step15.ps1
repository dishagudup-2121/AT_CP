$tests = @(
    @{
        Name = "Sequential workflow"
        Source = "WORKFLOW Demo`nTASK Search`nTASK Analyze`nEND"
        Expected = "SUCCESS"
    },
    @{
        Name = "Conditional workflow"
        Source = "WORKFLOW BranchDemo`nIF Success`nTASK Analyze`nELSE`nTASK Retry`nEND`nEND"
        Expected = "SUCCESS"
    },
    @{
        Name = "Unsupported task"
        Source = "WORKFLOW InvalidDemo`nTASK UnknownTask`nEND"
        Expected = "COMPILE_ERROR"
    },
    @{
        Name = "Invalid syntax"
        Source = "WORKFLOW BrokenDemo`nTASK Search"
        Expected = "COMPILE_ERROR"
    }
)

foreach ($test in $tests) {
    Write-Host "`nTesting: $($test.Name)" -ForegroundColor Cyan

    $body = @{ source = $test.Source } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod `
            -Uri "http://127.0.0.1:8000/api/compile/execute" `
            -Method Post `
            -ContentType "application/json" `
            -Body $body

        $actual = if ($response.success) {
            "SUCCESS"
        } else {
            "COMPILE_ERROR"
        }

        if ($actual -eq $test.Expected) {
            Write-Host "PASS: $actual" -ForegroundColor Green
        } else {
            Write-Host "FAIL: Expected $($test.Expected), got $actual" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "REQUEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}
