package ar.com.nutricionconciencia.app

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.lifecycle.lifecycleScope
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant

class ActivityWebView : ComponentActivity() {
    private val origin = BuildConfig.ACTIVITY_ORIGIN
    private val originUri = Uri.parse(origin)
    private val home = "$origin/pilot/"
    private var busy = false
    private var pendingPermission: ((JSONObject) -> Unit)? = null
    private var webView: WebView? = null
    private val healthPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    )
    private val permissionRequest = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) {
        val reply = pendingPermission
        pendingPermission = null
        if (reply != null) readToday(reply)
    }

    private fun trusted(uri: Uri): Boolean =
        uri.scheme == "https" && uri.host == originUri.host &&
            effectivePort(uri) == effectivePort(originUri) && uri.userInfo == null

    private fun effectivePort(uri: Uri) = if (uri.port == -1) 443 else uri.port

    private fun pilotPage(uri: Uri?): Boolean =
        uri != null && trusted(uri) &&
            (uri.path == "/pilot" || uri.path?.startsWith("/pilot/") == true)

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val view = WebView(this)
        webView = view
        view.settings.javaScriptEnabled = true
        view.settings.domStorageEnabled = true
        view.settings.allowFileAccess = false
        view.settings.allowContentAccess = false
        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.isForMainFrame && !pilotPage(request.url)
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(view, "nccActivity", setOf(origin)) {
                sender, message, sourceOrigin, isMainFrame, channel ->
                if (!isMainFrame || !trusted(sourceOrigin) || !pilotPage(sender.url?.let(Uri::parse))) return@addWebMessageListener
                val request = try { JSONObject(message.data ?: "") } catch (_: Exception) {
                    return@addWebMessageListener
                }
                val id = request.optString("id")
                val action = request.optString("action")
                if (id.length != 36 || action !in setOf("connect", "read")) return@addWebMessageListener
                val reply: (JSONObject) -> Unit = { result ->
                    channel.postMessage(JSONObject().put("id", id).put("result", result).toString())
                }
                when {
                    busy -> reply(status("error"))
                    HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE ->
                        reply(status("unavailable"))
                    else -> {
                        busy = true
                        if (action == "connect") {
                            pendingPermission = reply
                            try {
                                permissionRequest.launch(healthPermissions)
                            } catch (_: Exception) {
                                pendingPermission = null
                                busy = false
                                reply(status("error"))
                            }
                        } else {
                            readToday(reply)
                        }
                    }
                }
            }
        }
        setContentView(view)
        view.loadUrl(home)
    }

    private fun readToday(reply: (JSONObject) -> Unit) = lifecycleScope.launch {
        val now = Instant.now()
        val result = try {
            when (val reading = HealthConnectDailySteps(this@ActivityWebView).readToday(now)) {
                is DailyStepsResult.Available -> if (reading.total == null && reading.activeKilocalories == null) {
                    status("no_data")
                } else {
                    status("available").put("source", "health_connect").put("measuredAt", now.toString())
                        .put("steps", reading.total ?: JSONObject.NULL)
                        .put("activeKcal", reading.activeKilocalories ?: JSONObject.NULL)
                }
                DailyStepsResult.PermissionRequired -> status("permission")
                DailyStepsResult.NoData -> status("no_data")
                DailyStepsResult.ProviderUnavailable -> status("unavailable")
            }
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            status("error")
        } finally {
            busy = false
        }
        reply(result)
    }

    private fun status(value: String) = JSONObject().put("status", value)

    override fun onDestroy() {
        pendingPermission = null
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}
