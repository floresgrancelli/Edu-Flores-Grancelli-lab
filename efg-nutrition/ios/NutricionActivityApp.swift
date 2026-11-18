import SwiftUI
import WebKit

@main
struct NutricionActivityApp: App {
    var body: some Scene {
        WindowGroup { ActivityWebView() }
    }
}

private struct ActivityWebView: UIViewRepresentable {
    private let productionURL = URL(string: "https://efg-nutrition.onrender.com/pilot/")!

    func makeCoordinator() -> Bridge {
        #if DEBUG
        if let value = Bundle.main.object(forInfoDictionaryKey: "NCCActivityURL") as? String,
           let url = URL(string: value), url.scheme == "https", url.host != nil,
           url.user == nil, url.password == nil, (url.path == "/pilot" || url.path == "/pilot/") {
            return Bridge(home: url)
        }
        #endif
        return Bridge(home: productionURL)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.addScriptMessageHandler(
            context.coordinator, contentWorld: .page, name: "nccActivity"
        )
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.load(URLRequest(url: context.coordinator.home))
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}

    static func dismantleUIView(_ view: WKWebView, coordinator: Bridge) {
        view.configuration.userContentController.removeScriptMessageHandler(
            forName: "nccActivity", contentWorld: .page
        )
    }

    @MainActor
    final class Bridge: NSObject, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
        let home: URL
        private let reader = DailyHealthActivityReader()
        private var busy = false

        init(home: URL) { self.home = home }

        private func trusted(_ url: URL?) -> Bool {
            guard let url else { return false }
            return url.scheme == "https" && url.host == home.host &&
                (url.port ?? 443) == (home.port ?? 443) && url.user == nil &&
                (url.path == "/pilot" || url.path.hasPrefix("/pilot/"))
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(trusted(action.request.url) ? .allow : .cancel)
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage,
                                   replyHandler: @escaping (Any?, String?) -> Void) {
            guard message.frameInfo.isMainFrame, trusted(message.frameInfo.request.url),
                  let action = message.body as? String, action == "connect" || action == "read" else {
                replyHandler(nil, "Invalid activity request")
                return
            }
            guard !busy else { replyHandler(["status": "error"], nil); return }
            busy = true
            Task { @MainActor in
                defer { busy = false }
                do {
                    if action == "connect" { try await reader.requestReadAccess() }
                    let now = Date()
                    let current = try await reader.readToday(now: now)
                    if current.steps == nil && current.activeKilocalories == nil {
                        replyHandler(["status": "no_data_or_permission"], nil)
                        return
                    }
                    let timestamp = ISO8601DateFormatter()
                    timestamp.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    var result: [String: Any] = [
                        "status": "available", "source": "apple_health",
                        "measuredAt": timestamp.string(from: now),
                    ]
                    if let steps = current.steps { result["steps"] = steps.rounded() }
                    if let kcal = current.activeKilocalories { result["activeKcal"] = kcal }
                    replyHandler(result, nil)
                } catch DailyHealthActivityReader.ReaderError.unavailable {
                    replyHandler(["status": "unavailable"], nil)
                } catch {
                    replyHandler(["status": "error"], nil)
                }
            }
        }
    }
}
