namespace Sunfara.Integration.Tests.Infrastructure;

/// <summary>
/// Skips the test when FIRESTORE_EMULATOR_HOST is unset (local without Java/emulator).
/// CI always sets the host via <c>firebase emulators:exec</c>.
/// </summary>
public sealed class EmulatorFactAttribute : FactAttribute
{
    public EmulatorFactAttribute()
    {
        if (!EmulatorGuard.IsAvailable)
            Skip = "FIRESTORE_EMULATOR_HOST is not set — start the Firestore emulator (see docs/ops/CI_TEST_OPS.md).";
    }
}
