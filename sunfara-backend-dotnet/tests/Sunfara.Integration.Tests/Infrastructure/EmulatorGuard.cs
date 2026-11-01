namespace Sunfara.Integration.Tests.Infrastructure;

/* Integration tests intentionally refuse to run against production Firestore.
   They require FIRESTORE_EMULATOR_HOST (set by firebase emulators:exec in CI
   or by local docs). EmulatorFact skips when the host is absent. */
public static class EmulatorGuard
{
    public const string ProjectId = "demo-sunfara-test";

    public static bool IsAvailable =>
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FIRESTORE_EMULATOR_HOST"));
}
