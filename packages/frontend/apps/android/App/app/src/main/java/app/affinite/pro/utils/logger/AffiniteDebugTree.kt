package app.affinite.pro.utils.logger

import timber.log.Timber

class AffiniteDebugTree : Timber.DebugTree() {

    override fun createStackElementTag(element: StackTraceElement): String {
        return "Affinite:${super.createStackElementTag(element)}:${element.lineNumber}"
    }
}
