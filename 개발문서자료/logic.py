def main():
    value = 0  # 각도
    status = 0  # 0-1-0-1-0
    check = -100  # 스테이터스값이 바뀔때  증가
    count = 0  # 팔굽혀펴기 횟수

    while(True):
        print(count)

        i = 0
        for i in range(200):
            value = value + 1
            # 밸류값 증가
            if (value >= 170):
                check = status
                status = 1
            elif (value <= 110):
                check = status
                status = 0

            if (check == 1 and status == 0):
                count = count + 1
                check = -100

        i = 0
        for i in range(200):
            value = value - 1
            # 밸류값 증가
            if (value >= 170):
                check = status
                status = 1
            elif (value <= 110):
                check = status
                status = 0

            if (check == 1 and status == 0):
                count = count + 1
                check = -100

main()