using DemocracyGame;
using DemocracyGame.Hubs;
using DemocracyGame.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.PayloadSerializerOptions.PropertyNameCaseInsensitive = true;
        options.PayloadSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.CamelCase));
    });

builder.Services.AddSingleton<GameRoomService>();

// CORS for the Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            "http://localhost:3000",
            "http://localhost:3001",
            "https://democracy-game-omega.vercel.app"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors();

// Map the SignalR hub
app.MapHub<GameHub>("/game-hub");

// Health check
app.MapGet("/", () => "Democracy Game Server v1.0 — C# Authoritative");
app.MapGet("/health", () => Results.Ok(new { status = "healthy", version = "1.0" }));

app.Run();
