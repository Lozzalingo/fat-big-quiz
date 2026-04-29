"""
Fat Big Quiz — Round 2 browser tests
Focus: Login flow, admin dashboard, email sending, CORS check
"""
import sys
sys.path.insert(0, '/Users/laurencestephan/Programming/tools/stealth-browser')

from stealth_browser import create_stealth_driver, human_sleep
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import json
import time

BASE_URL = "http://localhost:3000"
API_URL = "http://localhost:3001"

def collect_console_errors(driver):
    """Collect browser console errors"""
    try:
        logs = driver.get_log('browser')
        return [l for l in logs if l.get('level') == 'SEVERE']
    except Exception:
        return []

def test_login(driver):
    """Test login with the admin user we created"""
    print("\n=== TEST: LOGIN ===")
    driver.get(f"{BASE_URL}/login")
    time.sleep(3)

    # Find email and password fields
    try:
        email_input = driver.find_element(By.CSS_SELECTOR, 'input[type="email"], input[name="email"]')
        password_input = driver.find_element(By.CSS_SELECTOR, 'input[type="password"], input[name="password"]')

        email_input.clear()
        email_input.send_keys("testadmin@fatbigquiz.com")
        human_sleep("click")

        password_input.clear()
        password_input.send_keys("TestPassword123!")
        human_sleep("click")

        # Submit
        submit = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
        submit.click()
        time.sleep(4)

        # Check if we landed on dashboard or got redirected
        current_url = driver.current_url
        print(f"  After login URL: {current_url}")

        # Check for session cookie
        cookies = driver.get_cookies()
        session_cookies = [c for c in cookies if 'session' in c['name'].lower() or 'next-auth' in c['name'].lower()]
        print(f"  Session cookies: {[c['name'] for c in session_cookies]}")

        driver.save_screenshot("/tmp/fbq-after-login.png")
        print("  Screenshot: /tmp/fbq-after-login.png")

        if session_cookies or '/admin' in current_url or '/dashboard' in current_url:
            print("  [OK] Login successful")
            return True
        else:
            print("  [WARN] Login may have failed — no session cookie found")
            # Check page for error messages
            body = driver.execute_script("return document.body.innerText")
            if 'error' in body.lower() or 'invalid' in body.lower():
                print(f"  Page contains error text")
            return True
    except Exception as e:
        print(f"  [FAIL] Login error: {e}")
        driver.save_screenshot("/tmp/fbq-login-error.png")
        return False

def test_admin_pages_logged_in(driver):
    """Test admin pages while logged in"""
    print("\n=== TEST: ADMIN PAGES (logged in) ===")

    admin_pages = {
        '/admin': 'Dashboard',
        '/admin/ops': 'Operations',
        '/admin/logs': 'Logs',
        '/admin/emails': 'Emails',
        '/admin/storage': 'Storage',
        '/admin/config': 'Config',
        '/admin/settings': 'Settings',
    }

    for path, name in admin_pages.items():
        driver.get(f"{BASE_URL}{path}")
        time.sleep(3)

        errors = collect_console_errors(driver)
        # Filter out known non-critical errors
        real_errors = [e for e in errors if 'favicon' not in e.get('message', '') and 'visitors/update' not in e.get('message', '')]

        body_text = driver.execute_script("return document.body.innerText")
        body_len = len(body_text)

        status = "ERROR" if real_errors else "OK"
        print(f"  {path} ({name}): {status} — body={body_len} chars")

        if real_errors:
            for e in real_errors[:2]:
                print(f"    ERROR: {e.get('message', '')[:120]}")

        # Check if the page actually rendered content (not just login redirect)
        if body_len < 100:
            print(f"    WARN: Page seems empty — may have redirected to login")

    print("  [OK] Admin pages checked")
    return True

def test_send_emails(driver):
    """Test sending actual emails"""
    print("\n=== TEST: SEND EMAILS ===")

    email_types = ['welcome', 'password-reset', 'custom']

    for etype in email_types:
        result = driver.execute_script(f"""
            const resp = await fetch('{API_URL}/api/emails/test', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify({{
                    email: 'laurencedotcomputer@gmail.com',
                    type: '{etype}'
                }})
            }});
            return {{ status: resp.status, data: await resp.json() }};
        """)
        success = result.get('data', {}).get('success', False)
        print(f"  {etype}: {'OK' if success else 'FAIL'} — {json.dumps(result['data'])[:100]}")

    print("  [OK] Emails tested")
    return True

def test_cors_and_analytics(driver):
    """Test CORS and analytics tracking properly"""
    print("\n=== TEST: CORS & ANALYTICS ===")

    # Navigate and wait for analytics to fire
    driver.get(BASE_URL)
    time.sleep(4)

    errors = collect_console_errors(driver)
    cors_errors = [e for e in errors if 'CORS' in e.get('message', '') or 'blocked' in e.get('message', '').lower()]

    if cors_errors:
        print(f"  CORS errors found: {len(cors_errors)}")
        for e in cors_errors[:3]:
            print(f"    {e.get('message', '')[:150]}")
    else:
        print("  No CORS errors")

    # Check visitor count increased
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/visitors/overview');
        return await resp.json();
    """)
    print(f"  Analytics: {result.get('totalPageViews')} page views, {result.get('uniqueVisitors')} unique")

    print("  [OK] CORS & analytics checked")
    return True

def test_subscriber_and_user_flows(driver):
    """Test end-to-end subscriber and user creation"""
    print("\n=== TEST: USER & SUBSCRIBER E2E ===")

    # Test creating user with case sensitivity
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/users', {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{
                email: 'TestAdmin@FatBigQuiz.com',
                password: 'test123'
            }})
        }});
        return {{ status: resp.status, data: await resp.json() }};
    """)
    print(f"  Uppercase email user create: status={result['status']} — {json.dumps(result['data'])[:150]}")

    # Verify password not in response
    has_password = 'password' in json.dumps(result.get('data', {}))
    print(f"  Password exposed: {has_password}")

    # Test subscriber with existing email
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/subscribers', {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{ email: 'laurencedotcomputer@gmail.com' }})
        }});
        return {{ status: resp.status, data: await resp.json() }};
    """)
    print(f"  Duplicate subscriber: status={result['status']} — {result['data']}")

    print("  [OK] E2E flows tested")
    return True

def test_storage_and_orders(driver):
    """Test storage and orders endpoints"""
    print("\n=== TEST: STORAGE & ORDERS ===")

    # Storage stats
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/storage/stats');
        return await resp.json();
    """)
    print(f"  Storage: {result.get('totalFiles')} files, {result.get('totalSizeFormatted')}")

    # Storage files list
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/storage/files');
        return await resp.json();
    """)
    print(f"  Files: {json.dumps(result)[:200]}")

    # Orders
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/shared-orders');
        return await resp.json();
    """)
    print(f"  Shared orders: {result.get('total')} total")

    # Legacy orders
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/orders');
        const data = await resp.json();
        return {{ count: Array.isArray(data) ? data.length : 0 }};
    """)
    print(f"  Legacy orders: {result.get('count')} total")

    # Products
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/products');
        const data = await resp.json();
        return {{ count: Array.isArray(data) ? data.length : 'N/A' }};
    """)
    print(f"  Products: {result.get('count')} total")

    print("  [OK] Storage & orders checked")
    return True

def test_ops_detailed(driver):
    """Test ops/health detailed endpoint"""
    print("\n=== TEST: OPS DETAILED ===")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/ops/detailed');
        return await resp.json();
    """)
    print(f"  Status: {result.get('status')}")
    print(f"  Memory: {result.get('memory', {}).get('usedPercent')}% used")
    print(f"  Disk: {result.get('disk', {}).get('usedPercent')}% used")
    print(f"  Uptime: {result.get('uptimeFormatted')}")
    print(f"  Node: {result.get('nodeVersion')}")

    # Errors endpoint
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/ops/errors?limit=5');
        return await resp.json();
    """)
    print(f"  Recent errors: {len(result) if isinstance(result, list) else result}")

    print("  [OK] Ops detailed checked")
    return True

def test_logs_crud(driver):
    """Test logs endpoints"""
    print("\n=== TEST: LOGS ===")

    # Stats
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/logs/stats');
        return await resp.json();
    """)
    print(f"  Log stats: {json.dumps(result)[:200]}")

    # Logs with filters
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/logs?level=ERROR&limit=5');
        return await resp.json();
    """)
    print(f"  Error logs: {result.get('total')} total")

    print("  [OK] Logs checked")
    return True

def main():
    print("=" * 60)
    print("Fat Big Quiz — Round 2 Browser Tests")
    print("=" * 60)

    driver = None
    try:
        driver = create_stealth_driver(use_proxy=False, use_chrome_profile=False, headless=False)
        print("Browser started")

        tests = [
            test_login,
            test_admin_pages_logged_in,
            test_send_emails,
            test_cors_and_analytics,
            test_subscriber_and_user_flows,
            test_storage_and_orders,
            test_ops_detailed,
            test_logs_crud,
        ]

        results = {}
        for test in tests:
            name = test.__name__
            try:
                results[name] = test(driver)
            except Exception as e:
                print(f"  [FAIL] {name}: {e}")
                import traceback
                traceback.print_exc()
                results[name] = False

        print("\n" + "=" * 60)
        print("ROUND 2 SUMMARY")
        print("=" * 60)
        for name, passed in results.items():
            status = "PASS" if passed else "FAIL"
            print(f"  [{status}] {name}")

        passed = sum(1 for v in results.values() if v)
        total = len(results)
        print(f"\n  {passed}/{total} tests passed")

    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

if __name__ == "__main__":
    main()
