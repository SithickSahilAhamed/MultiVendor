FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY sunfara-backend-dotnet/ ./
RUN dotnet restore src/Sunfara.Api/Sunfara.Api.csproj
RUN dotnet publish src/Sunfara.Api/Sunfara.Api.csproj -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "Sunfara.Api.dll"]
