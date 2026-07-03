using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

/* Public (unauthenticated) endpoints for a vendor to create their own
   account - the piece that was entirely missing before: previously the
   only way a vendor record could exist was an admin typing it in by hand,
   with no login ever attached to it. */
[ApiController, Route("api/vendor-auth")]
public sealed class VendorAuthController(FirestoreCatalogStore store) : ControllerBase
{
    [EnableRateLimiting("auth"), HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] VendorRegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Name, email, phone, and password are required." });
        if (request.Password.Length < 8)
            return BadRequest(new { error = "Password must be at least 8 characters." });

        UserRecord user;
        try
        {
            user = await FirebaseAuth.DefaultInstance.CreateUserAsync(new UserRecordArgs
            {
                Email = request.Email,
                Password = request.Password,
                DisplayName = request.Name,
                EmailVerified = false
            });
        }
        catch (FirebaseAuthException e)
        {
            var message = e.AuthErrorCode == AuthErrorCode.EmailAlreadyExists
                ? "An account with this email already exists."
                : e.Message;
            return BadRequest(new { error = message });
        }

        await FirebaseAuth.DefaultInstance.SetCustomUserClaimsAsync(user.Uid, new Dictionary<string, object> { ["role"] = "vendor" });

        // Vendor doc ID intentionally matches the Firebase Auth UID - firestore.rules
        // already assumes this (`request.auth.uid == id`), so this is the ID scheme
        // the rest of the system was designed around, even though the admin's
        // manual "Add Vendor" path never followed it.
        await store.Database.Collection("vendors").Document(user.Uid).CreateAsync(new Dictionary<string, object>
        {
            ["name"] = request.Name,
            ["email"] = request.Email,
            ["phone"] = request.Phone,
            ["status"] = "pending",
            ["commission"] = 10.0,
            ["products"] = 0,
            ["revenue"] = 0.0,
            ["rating"] = 0.0,
            ["reviews"] = 0,
            ["verified"] = false,
            ["kycStatus"] = "pending",
            ["createdAt"] = FieldValue.ServerTimestamp,
            ["updatedAt"] = FieldValue.ServerTimestamp
        });

        return Ok(new { uid = user.Uid, message = "Registered. Your account is pending admin approval." });
    }
}

public sealed record VendorRegisterRequest(string Name, string Email, string Phone, string Password);
