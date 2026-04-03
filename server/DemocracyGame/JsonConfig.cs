using System.Text.Json;
using System.Text.Json.Serialization;

namespace DemocracyGame;

/// <summary>
/// JSON serialization config — camelCase to match TypeScript frontend expectations.
/// </summary>
public static class JsonConfig
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
        Converters =
        {
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase),
        },
    };
}
