package app.affinite.pro.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable

object AffiniteTheme {
    val colors: AffiniteColorScheme
        @ReadOnlyComposable
        @Composable
        get() = LocalAffiniteColors.current

    val typography: AffiniteTypography
        @ReadOnlyComposable
        @Composable
        get() = LocalAffiniteTypography.current
}

@Composable
fun AffiniteTheme(
    mode: ThemeMode = ThemeMode.System,
    content: @Composable () -> Unit
) {
    val colors = when (mode) {
        ThemeMode.Light -> affiniteLightScheme
        ThemeMode.Dark -> affiniteDarkScheme
        ThemeMode.System -> if (isSystemInDarkTheme()) affiniteDarkScheme else affiniteLightScheme
    }

    CompositionLocalProvider(LocalAffiniteColors provides colors) {
        MaterialTheme {
            content()
        }
    }
}

enum class ThemeMode(name: String) {
    Light("light"),
    Dark("dark"),
    System("system");

    fun of(name: String) = when (name) {
        "light" -> Light
        "dark" -> Dark
        else -> System
    }
}