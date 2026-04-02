using DemocracyGame.Hubs;
using DemocracyGame.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddSignalR();
builder.Services.AddSingleton<GameRoomService>();

// CORS for the Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            "http://localhost:3000",
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
app.MapGet("/", () => "Democracy Game Server v1.0");

app.Run();
